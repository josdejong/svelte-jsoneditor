import { deepEqual } from './diff.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StructuralDiffType = 'added' | 'removed' | 'modified'

export interface StructuralDiffResult {
  /** Map of JSON pointer → diff type for ALL changed nodes (parents + leaves) */
  changes: Map<string, StructuralDiffType>
  /** Set of JSON pointers that have changed descendants (for parent highlighting) */
  changedAncestors: Set<string>
  /** Number of top-level changes (meaningful for navigation) */
  changeCount: number
  /** Ordered list of top-level changed paths for navigation */
  changedPaths: string[]
}

// ---------------------------------------------------------------------------
// Structural diff computation
// ---------------------------------------------------------------------------

/**
 * Escape a JSON pointer segment (RFC 6901)
 */
export function escapePointer(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Build a child pointer from parent + key
 */
function childPointer(parent: string, key: string | number): string {
  return parent + '/' + escapePointer(String(key))
}

/**
 * Mark an entire subtree as a single diff type (for added/removed branches).
 * Marks ALL nodes (parents and leaves) so collapsed nodes show correct colors.
 */
function markSubtree(
  value: unknown,
  pointer: string,
  diffType: StructuralDiffType,
  changes: Map<string, StructuralDiffType>
): void {
  // Always mark this node
  changes.set(pointer, diffType)

  if (value === null || value === undefined || typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      markSubtree(value[i], childPointer(pointer, i), diffType, changes)
    }
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      markSubtree(
        (value as Record<string, unknown>)[key],
        childPointer(pointer, key),
        diffType,
        changes
      )
    }
  }
}

/**
 * Recursively diff two JSON values, recording changes at leaf level.
 * Parent nodes are NOT marked here — only markSubtree marks parents
 * (for fully added/removed subtrees).
 */
function diffRecursive(
  left: unknown,
  right: unknown,
  pointer: string,
  changes: Map<string, StructuralDiffType>
): void {
  // Fast path: identical values
  if (left === right) return
  if (deepEqual(left, right)) return

  const leftIsObj =
    left !== null && left !== undefined && typeof left === 'object' && !Array.isArray(left)
  const rightIsObj =
    right !== null && right !== undefined && typeof right === 'object' && !Array.isArray(right)
  const leftIsArr = Array.isArray(left)
  const rightIsArr = Array.isArray(right)

  // Both are objects → compare key by key
  if (leftIsObj && rightIsObj) {
    const leftObj = left as Record<string, unknown>
    const rightObj = right as Record<string, unknown>
    const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)])

    for (const key of allKeys) {
      const cp = childPointer(pointer, key)
      const inLeft = key in leftObj
      const inRight = key in rightObj

      if (inLeft && !inRight) {
        markSubtree(leftObj[key], cp, 'removed', changes)
      } else if (!inLeft && inRight) {
        markSubtree(rightObj[key], cp, 'added', changes)
      } else {
        diffRecursive(leftObj[key], rightObj[key], cp, changes)
      }
    }
    return
  }

  // Both are arrays → always match by index for consistent paths between panels
  // (id-based matching is handled at a higher level by pruneToChanges/pruneIdArray)
  if (leftIsArr && rightIsArr) {
    const leftArr = left as unknown[]
    const rightArr = right as unknown[]
    const maxLen = Math.max(leftArr.length, rightArr.length)

    for (let i = 0; i < maxLen; i++) {
      const cp = childPointer(pointer, i)
      if (i >= leftArr.length) {
        markSubtree(rightArr[i], cp, 'added', changes)
      } else if (i >= rightArr.length) {
        markSubtree(leftArr[i], cp, 'removed', changes)
      } else {
        diffRecursive(leftArr[i], rightArr[i], cp, changes)
      }
    }
    return
  }

  // Type mismatch or scalar difference → mark as modified at this level
  changes.set(pointer, 'modified')
}

/**
 * Compute ancestors for all changed paths.
 * For a change at "/a/b/c", ancestors are "", "/a", "/a/b".
 */
function computeAncestors(changedPaths: string[]): Set<string> {
  const ancestors = new Set<string>()
  for (const path of changedPaths) {
    let pos = 0
    ancestors.add('')
    while (true) {
      const nextSlash = path.indexOf('/', pos + 1)
      if (nextSlash === -1) break
      ancestors.add(path.substring(0, nextSlash))
      pos = nextSlash
    }
  }
  return ancestors
}

/**
 * Filter changed paths to only the "topmost" — paths that don't have
 * an ancestor in the changes map with the same diff type.
 * This gives meaningful navigation (e.g., 12 added items, not 120 leaf properties).
 */
function getTopChangedPaths(changes: Map<string, StructuralDiffType>): string[] {
  const tops: string[] = []

  for (const [path, type] of changes) {
    // Walk up the path to see if any ancestor has the same type
    let hasAncestor = false
    let pos = path.length
    while (pos > 0) {
      pos = path.lastIndexOf('/', pos - 1)
      if (pos < 0) break
      const ancestor = path.substring(0, pos) || ''
      const ancestorType = changes.get(ancestor)
      if (ancestorType === type) {
        hasAncestor = true
        break
      }
      if (pos === 0) break
    }
    // Also check root for non-root paths
    if (!hasAncestor && path !== '' && changes.get('') === type) {
      hasAncestor = true
    }

    if (!hasAncestor) {
      tops.push(path)
    }
  }

  return tops
}

/**
 * Compute a structural diff between two JSON values.
 * Returns changed paths with their diff types, ancestor information, and navigation data.
 */
export function computeStructuralDiff(
  left: unknown,
  right: unknown
): StructuralDiffResult {
  const changes = new Map<string, StructuralDiffType>()

  if (left === undefined && right === undefined) {
    return { changes, changedAncestors: new Set(), changeCount: 0, changedPaths: [] }
  }

  // Only treat `undefined` as absent (added/removed).
  // `null` is a valid JSON value and should be compared normally.
  if (left === undefined) {
    markSubtree(right, '', 'added', changes)
  } else if (right === undefined) {
    markSubtree(left, '', 'removed', changes)
  } else {
    diffRecursive(left, right, '', changes)
  }

  // Get topmost changed paths for navigation (not every leaf)
  const topPaths = getTopChangedPaths(changes)

  // Sort paths in natural order so navigation follows visual tree order
  // (e.g., /levels/2 before /levels/10)
  const sortedPaths = topPaths.sort((a, b) => {
    const aParts = a.split('/')
    const bParts = b.split('/')
    const len = Math.min(aParts.length, bParts.length)
    for (let i = 0; i < len; i++) {
      if (aParts[i] === bParts[i]) continue
      const aNum = Number(aParts[i])
      const bNum = Number(bParts[i])
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
      return aParts[i] < bParts[i] ? -1 : 1
    }
    return aParts.length - bParts.length
  })

  const changedAncestors = computeAncestors([...changes.keys()])

  return {
    changes,
    changedAncestors,
    changeCount: sortedPaths.length,
    changedPaths: sortedPaths
  }
}
