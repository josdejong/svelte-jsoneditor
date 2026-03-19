import diffSequence from '../generated/diffSequence.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffLineType = 'equal' | 'added' | 'removed' | 'modified'

export interface WordDiff {
  type: 'equal' | 'added' | 'removed'
  value: string
}

export interface DiffLine {
  type: DiffLineType
  lineNumber: number | null
  content: string
  wordDiffs?: WordDiff[]
}

export interface DiffResult {
  leftLines: DiffLine[]
  rightLines: DiffLine[]
  changeCount: number
}

// ---------------------------------------------------------------------------
// Pruning — strip unchanged entries so the diff only processes what changed
// ---------------------------------------------------------------------------

/**
 * Deep equality check for arbitrary JSON values.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]))
  }

  if (Array.isArray(b)) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj).sort()
  const bKeys = Object.keys(bObj).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k, i) => k === bKeys[i] && deepEqual(aObj[k], bObj[k]))
}

/**
 * For arrays of objects with `id` fields, keep only entries that differ.
 */
function pruneIdArray(
  baseArr: Array<Record<string, unknown>>,
  headArr: Array<Record<string, unknown>>
): [Array<Record<string, unknown>>, Array<Record<string, unknown>>] {
  const baseIdx = new Map<unknown, Record<string, unknown>>()
  const headIdx = new Map<unknown, Record<string, unknown>>()
  for (const e of baseArr) if (e && typeof e === 'object' && 'id' in e) baseIdx.set(e.id, e)
  for (const e of headArr) if (e && typeof e === 'object' && 'id' in e) headIdx.set(e.id, e)

  const allIds = [...new Set([...baseIdx.keys(), ...headIdx.keys()])].sort()
  const prunedBase: Array<Record<string, unknown>> = []
  const prunedHead: Array<Record<string, unknown>> = []

  for (const id of allIds) {
    const bv = baseIdx.get(id)
    const hv = headIdx.get(id)
    if (!bv) {
      prunedHead.push(hv!)
    } else if (!hv) {
      prunedBase.push(bv)
    } else if (!deepEqual(bv, hv)) {
      prunedBase.push(bv)
      prunedHead.push(hv)
    }
  }

  return [prunedBase, prunedHead]
}

/**
 * Return pruned copies of two objects containing only changed top-level keys.
 * For array values with id-bearing objects, prunes at the entry level too.
 */
export function pruneToChanges(
  base: Record<string, unknown> | null | undefined,
  head: Record<string, unknown> | null | undefined
): [Record<string, unknown>, Record<string, unknown>] {
  const b = base ?? {}
  const h = head ?? {}
  const allKeys = [...new Set([...Object.keys(b), ...Object.keys(h)])].sort()

  const prunedBase: Record<string, unknown> = {}
  const prunedHead: Record<string, unknown> = {}

  for (const key of allKeys) {
    const bv = b[key]
    const hv = h[key]

    if (deepEqual(bv, hv)) continue

    if (!(key in b)) {
      prunedHead[key] = hv
    } else if (!(key in h)) {
      prunedBase[key] = bv
    } else if (
      Array.isArray(bv) &&
      Array.isArray(hv) &&
      bv.length > 0 &&
      typeof bv[0] === 'object' &&
      bv[0] !== null &&
      'id' in bv[0]
    ) {
      const [pb, ph] = pruneIdArray(
        bv as Array<Record<string, unknown>>,
        hv as Array<Record<string, unknown>>
      )
      prunedBase[key] = pb
      prunedHead[key] = ph
    } else {
      prunedBase[key] = bv
      prunedHead[key] = hv
    }
  }

  return [prunedBase, prunedHead]
}

/**
 * List all top-level keys with their change status.
 */
export interface KeyInfo {
  key: string
  status: 'equal' | 'added' | 'removed' | 'modified'
}

export function getKeyDiffSummary(
  base: Record<string, unknown> | null | undefined,
  head: Record<string, unknown> | null | undefined
): KeyInfo[] {
  const b = base ?? {}
  const h = head ?? {}
  const allKeys = [...new Set([...Object.keys(b), ...Object.keys(h)])].sort()

  return allKeys.map((key) => {
    if (!(key in b)) return { key, status: 'added' as const }
    if (!(key in h)) return { key, status: 'removed' as const }
    if (!deepEqual(b[key], h[key])) return { key, status: 'modified' as const }
    return { key, status: 'equal' as const }
  })
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

/**
 * Compute a side-by-side diff of two JSON values.
 * Returns aligned left/right line arrays with line-level and word-level diffs.
 */
export function computeJsonDiff(leftJson: unknown, rightJson: unknown): DiffResult {
  const leftText = JSON.stringify(leftJson, null, 2) ?? ''
  const rightText = JSON.stringify(rightJson, null, 2) ?? ''

  const leftRaw = leftText.split('\n')
  const rightRaw = rightText.split('\n')

  return computeLineDiff(leftRaw, rightRaw)
}

/**
 * Compute a side-by-side diff from two arrays of lines.
 */
export function computeLineDiff(leftRaw: string[], rightRaw: string[]): DiffResult {
  // Find LCS using diffSequence
  const aLength = leftRaw.length
  const bLength = rightRaw.length

  // Collect common subsequences
  const commonRanges: Array<{ aStart: number; bStart: number; length: number }> = []

  function isCommon(aIndex: number, bIndex: number): boolean {
    return leftRaw[aIndex] === rightRaw[bIndex]
  }

  function foundSubsequence(nCommon: number, aCommon: number, bCommon: number): void {
    commonRanges.push({ aStart: aCommon, bStart: bCommon, length: nCommon })
  }

  diffSequence(aLength, bLength, isCommon, foundSubsequence)

  // Build raw diff operations from common ranges
  const rawOps: Array<{
    type: 'equal' | 'change'
    leftStart: number
    leftEnd: number
    rightStart: number
    rightEnd: number
  }> = []

  let aPos = 0
  let bPos = 0

  for (const range of commonRanges) {
    // Non-common region before this common range
    if (aPos < range.aStart || bPos < range.bStart) {
      rawOps.push({
        type: 'change',
        leftStart: aPos,
        leftEnd: range.aStart,
        rightStart: bPos,
        rightEnd: range.bStart
      })
    }

    // Common region
    rawOps.push({
      type: 'equal',
      leftStart: range.aStart,
      leftEnd: range.aStart + range.length,
      rightStart: range.bStart,
      rightEnd: range.bStart + range.length
    })

    aPos = range.aStart + range.length
    bPos = range.bStart + range.length
  }

  // Trailing non-common region
  if (aPos < aLength || bPos < bLength) {
    rawOps.push({
      type: 'change',
      leftStart: aPos,
      leftEnd: aLength,
      rightStart: bPos,
      rightEnd: bLength
    })
  }

  // Build aligned output
  const leftLines: DiffLine[] = []
  const rightLines: DiffLine[] = []
  let changeCount = 0

  for (const op of rawOps) {
    if (op.type === 'equal') {
      for (let i = 0; i < op.leftEnd - op.leftStart; i++) {
        const aIdx = op.leftStart + i
        const bIdx = op.rightStart + i
        leftLines.push({ type: 'equal', lineNumber: aIdx + 1, content: leftRaw[aIdx] })
        rightLines.push({ type: 'equal', lineNumber: bIdx + 1, content: rightRaw[bIdx] })
      }
    } else {
      const removedCount = op.leftEnd - op.leftStart
      const addedCount = op.rightEnd - op.rightStart

      // Pair removed+added lines as modified
      const pairedCount = Math.min(removedCount, addedCount)

      for (let i = 0; i < pairedCount; i++) {
        const aIdx = op.leftStart + i
        const bIdx = op.rightStart + i
        const wordDiffsLeft = computeWordDiff(leftRaw[aIdx], rightRaw[bIdx], 'removed')
        const wordDiffsRight = computeWordDiff(leftRaw[aIdx], rightRaw[bIdx], 'added')

        leftLines.push({
          type: 'modified',
          lineNumber: aIdx + 1,
          content: leftRaw[aIdx],
          wordDiffs: wordDiffsLeft
        })
        rightLines.push({
          type: 'modified',
          lineNumber: bIdx + 1,
          content: rightRaw[bIdx],
          wordDiffs: wordDiffsRight
        })
        changeCount++
      }

      // Extra removed lines (no pair on right)
      for (let i = pairedCount; i < removedCount; i++) {
        const aIdx = op.leftStart + i
        leftLines.push({ type: 'removed', lineNumber: aIdx + 1, content: leftRaw[aIdx] })
        rightLines.push({ type: 'removed', lineNumber: null, content: '' })
        changeCount++
      }

      // Extra added lines (no pair on left)
      for (let i = pairedCount; i < addedCount; i++) {
        const bIdx = op.rightStart + i
        leftLines.push({ type: 'added', lineNumber: null, content: '' })
        rightLines.push({ type: 'added', lineNumber: bIdx + 1, content: rightRaw[bIdx] })
        changeCount++
      }
    }
  }

  return { leftLines, rightLines, changeCount }
}

/**
 * Tokenize a string into words for word-level diff.
 * Splits on whitespace boundaries and punctuation, preserving delimiters.
 */
export function tokenize(line: string): string[] {
  const tokens: string[] = []
  const regex = /(\s+|[{}[\]:,"])/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(line.slice(lastIndex, match.index))
    }
    tokens.push(match[0])
    lastIndex = regex.lastIndex
  }

  if (lastIndex < line.length) {
    tokens.push(line.slice(lastIndex))
  }

  return tokens
}

/**
 * Compute word-level diff between two lines.
 * @param side - which side to return: 'removed' returns left-perspective diffs, 'added' returns right-perspective
 */
export function computeWordDiff(
  leftLine: string,
  rightLine: string,
  side: 'removed' | 'added'
): WordDiff[] {
  const leftTokens = tokenize(leftLine)
  const rightTokens = tokenize(rightLine)

  const commonRanges: Array<{ aStart: number; bStart: number; length: number }> = []

  diffSequence(
    leftTokens.length,
    rightTokens.length,
    (aIdx, bIdx) => leftTokens[aIdx] === rightTokens[bIdx],
    (nCommon, aCommon, bCommon) => {
      commonRanges.push({ aStart: aCommon, bStart: bCommon, length: nCommon })
    }
  )

  const diffs: WordDiff[] = []
  let aPos = 0
  let bPos = 0

  for (const range of commonRanges) {
    // Tokens only in left (removed)
    if (aPos < range.aStart) {
      const value = leftTokens.slice(aPos, range.aStart).join('')
      if (side === 'removed') {
        diffs.push({ type: 'removed', value })
      }
    }

    // Tokens only in right (added)
    if (bPos < range.bStart) {
      const value = rightTokens.slice(bPos, range.bStart).join('')
      if (side === 'added') {
        diffs.push({ type: 'added', value })
      }
    }

    // Common tokens
    const tokens = side === 'removed' ? leftTokens : rightTokens
    const start = side === 'removed' ? range.aStart : range.bStart
    const value = tokens.slice(start, start + range.length).join('')
    if (value) {
      diffs.push({ type: 'equal', value })
    }

    aPos = range.aStart + range.length
    bPos = range.bStart + range.length
  }

  // Trailing tokens
  if (aPos < leftTokens.length && side === 'removed') {
    diffs.push({ type: 'removed', value: leftTokens.slice(aPos).join('') })
  }
  if (bPos < rightTokens.length && side === 'added') {
    diffs.push({ type: 'added', value: rightTokens.slice(bPos).join('') })
  }

  return diffs
}
