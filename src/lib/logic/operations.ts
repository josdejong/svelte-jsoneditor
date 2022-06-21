import { cloneDeepWith, first, initial, isEmpty, last, times } from 'lodash-es'
import { compileJSONPointer, getIn, type JSONPath } from 'immutable-json-patch'
import {
  isJSONArray,
  isJSONObject,
  parseAndRepair,
  parseAndRepairOrUndefined,
  parsePartialJson
} from '../utils/jsonUtils.js'
import { findUniqueName } from '../utils/stringUtils.js'
import { isObject, isObjectOrArray } from '../utils/typeUtils.js'
import { getKeys, getNextKeys } from './documentState.js'
import {
  createAfterSelection,
  createInsideSelection,
  createSelectionFromOperations,
  createValueSelection,
  getEndPath,
  getParentPath,
  getStartPath,
  isAfterSelection,
  isInsideSelection,
  isKeySelection,
  isMultiSelection,
  isValueSelection,
  pathStartsWith
} from './selection.js'
import type {
  ClipboardValues,
  DocumentState,
  DragInsideAction,
  JSONData,
  JSONObject,
  JSONPatchDocument,
  JSONPatchOperation,
  Path,
  Selection
} from '../types'

/**
 * Create a JSONPatch for an insert operation.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the inserted node in case of duplicating
 * and object property
 */
// TODO: write tests
export function insertBefore(
  json: JSONData,
  documentState: DocumentState,
  path: Path,
  values: ClipboardValues
): JSONPatchDocument {
  // TODO: find a better name and define datastructure for values
  const parentPath: JSONPath = initial(path)
  const parent = getIn(json, parentPath)

  if (isJSONArray(parent)) {
    // the path is parsed from a JSONPatch operation,
    // so array indices are a string which we have to parse into a number
    const offset = parseInt(String(last(path)), 10)
    return values.map((entry, index) => ({
      op: 'add',
      path: compileJSONPointer(parentPath.concat(offset + index)),
      value: entry.value
    }))
  } else if (isJSONObject(parent)) {
    // 'object'
    const afterKey = last(path)
    const keys = getKeys(parent, documentState, compileJSONPointer(parentPath))
    const nextKeys = getNextKeys(keys, afterKey, true)

    return [
      // insert new values
      ...values.map((entry) => {
        const newProp = findUniqueName(entry.key, keys)
        return {
          op: 'add',
          path: compileJSONPointer(parentPath.concat(newProp)),
          value: entry.value
        }
      }),

      // move all lower down keys so the inserted key will maintain its position
      ...nextKeys.map((key) => moveDown(parentPath, key))
    ]
  } else {
    throw new Error('Cannot create insert operations: parent must be an Object or Array')
  }
}

/**
 * Create a JSONPatch for an append operation. The values will be appended
 * to the end of the array or object.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the inserted node in case of duplicating
 * and object property
 *
 * @param {JSON} json
 * @param {Path} path
 * @param {ClipboardValues} values
 * @return {JSONPatchDocument}
 */
export function append(json, path, values) {
  // TODO: find a better name and define data structure for values
  const parent = getIn(json, path)

  if (Array.isArray(parent)) {
    const offset = parent.length
    return values.map((entry, index) => ({
      op: 'add',
      path: compileJSONPointer(path.concat(offset + index)),
      value: entry.value
    }))
  } else {
    // 'object'
    return values.map((entry) => {
      const newProp = findUniqueName(entry.key, Object.keys(parent))
      return {
        op: 'add',
        path: compileJSONPointer(path.concat(newProp)),
        value: entry.value
      }
    })
  }
}

/**
 * Rename an object key
 * Not applicable to arrays
 *
 * @param {Path} parentPath
 * @param {string[]} keys
 * @param {string} oldKey
 * @param {string} newKey
 * @returns {JSONPatchDocument}
 */
export function rename(parentPath, keys, oldKey, newKey) {
  const filteredKeys = keys.filter((key) => key !== oldKey)
  const newKeyUnique = findUniqueName(newKey, filteredKeys)
  const nextKeys = getNextKeys(keys, oldKey, false)

  return [
    // rename a key
    {
      op: 'move',
      from: compileJSONPointer(parentPath.concat(oldKey)),
      path: compileJSONPointer(parentPath.concat(newKeyUnique))
    },

    // move all lower down keys so the renamed key will maintain it's position
    ...nextKeys.map((key) => moveDown(parentPath, key))
  ]
}

/**
 * Create a JSONPatch for an insert operation.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the inserted node in case of duplicating
 * and object property
 */
export function replace(
  json: JSONData,
  documentState: DocumentState,
  paths: Path[],
  values: ClipboardValues
): JSONPatchDocument {
  // TODO: find a better name and define data structure for values
  const firstPath: JSONPath = first(paths)
  const parentPath = initial(firstPath)
  const parent = getIn(json, parentPath)

  if (isJSONArray(parent)) {
    const firstPath: JSONPath = first(paths)
    const offset = firstPath ? parseInt(last(firstPath) as string, 10) : 0

    return [
      // remove operations
      ...removeAll(paths),

      // insert operations
      ...values.map((entry, index) => {
        const operation: JSONPatchOperation = {
          op: 'add',
          path: compileJSONPointer(parentPath.concat(index + offset)),
          value: entry.value
        }

        return operation
      })
    ]
  } else if (isJSONObject(parent)) {
    // parent is Object
    // if we're going to replace an existing object with key "a" with a new
    // key "a", we must not create a new unique name "a (copy)".
    const lastPath: JSONPath = last(paths)
    const parentPath = initial(lastPath)
    const beforeKey = last(lastPath)
    const keys: string[] = getKeys(parent, documentState, compileJSONPointer(parentPath))
    const nextKeys = getNextKeys(keys, beforeKey, false)
    const removeKeys = new Set(paths.map((path) => last(path)))
    const filteredKeys = keys.filter((key) => !removeKeys.has(key))

    return [
      // remove operations
      ...removeAll(paths),

      // insert operations
      ...values.map((entry) => {
        const newProp = findUniqueName(entry.key, filteredKeys)
        return {
          op: 'add',
          path: compileJSONPointer(parentPath.concat(newProp)),
          value: entry.value
        }
      }),

      // move down operations
      // move all lower down keys so the renamed key will maintain it's position
      ...nextKeys.map((key) => moveDown(parentPath, key))
    ]
  } else {
    throw new Error('Cannot create replace operations: parent must be an Object or Array')
  }
}

/**
 * Create a JSONPatch for a duplicate action.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the duplicated node in case of duplicating
 * and object property
 */
export function duplicate(
  json: JSONData,
  documentState: DocumentState,
  paths: Path[]
): JSONPatchDocument {
  // FIXME: here we assume selection.paths is sorted correctly, that's a dangerous assumption
  const lastPath: JSONPath = last(paths)

  if (isEmpty(lastPath)) {
    throw new Error('Cannot duplicate root object')
  }

  const parentPath = initial(lastPath)
  const beforeKey = last(lastPath)
  const parent = getIn(json, parentPath)

  if (isJSONArray(parent)) {
    const lastPath: JSONPath = last(paths)
    const offset = lastPath ? parseInt(last(lastPath) as string, 10) + 1 : 0

    return [
      // copy operations
      ...paths.map((path, index) => {
        const operation: JSONPatchOperation = {
          op: 'copy',
          from: compileJSONPointer(path),
          path: compileJSONPointer(parentPath.concat(index + offset))
        }

        return operation
      })
    ]
  } else if (isJSONObject(parent)) {
    // 'object'
    const keys = getKeys(parent, documentState, compileJSONPointer(parentPath))
    const nextKeys = getNextKeys(keys, beforeKey, false)

    return [
      // copy operations
      ...paths.map((path) => {
        const prop = last(path)
        const newProp = findUniqueName(prop, keys)

        return {
          op: 'copy',
          from: compileJSONPointer(path),
          path: compileJSONPointer(parentPath.concat(newProp))
        }
      }),

      // move down operations
      // move all lower down keys so the renamed key will maintain it's position
      ...nextKeys.map((key) => moveDown(parentPath, key))
    ]
  } else {
    throw new Error('Cannot create duplicate operations: parent must be an Object or Array')
  }
}

/**
 * Create a JSONPatch for an extract action.
 */
// TODO: write unit tests
export function extract(json: JSONData, selection: Selection): JSONPatchDocument {
  if (isValueSelection(selection)) {
    return [
      {
        op: 'move',
        from: compileJSONPointer(selection.focusPath),
        path: ''
      }
    ]
  }

  if (isMultiSelection(selection)) {
    const parentPath: JSONPath = initial(selection.focusPath)
    const parent = getIn(json, parentPath)

    if (isJSONArray(parent)) {
      const value = selection.paths.map((path) => {
        const index = parseInt(String(last(path)), 10)
        return parent[index]
      })

      return [
        {
          op: 'replace',
          path: '',
          value
        }
      ]
    } else if (isJSONObject(parent)) {
      // object
      const value = {}
      selection.paths.forEach((path) => {
        const key = String(last(path))
        value[key] = parent[key]
      })

      return [
        {
          op: 'replace',
          path: '',
          value
        }
      ]
    }
  } else {
    throw new Error('Cannot create extract operations: parent must be an Object or Array')
  }

  // this should never happen
  throw new Error('Cannot extract: unsupported type of selection ' + JSON.stringify(selection))
}

// TODO: write unit tests
export function insert(
  json: JSONData,
  documentState: DocumentState,
  clipboardText: string
): JSONPatchDocument {
  const selection = documentState.selection

  if (isKeySelection(selection)) {
    // rename key
    const clipboard = parseAndRepairOrUndefined(clipboardText)
    const parentPath = initial(selection.focusPath)
    const parent = getIn(json, parentPath)
    const keys = getKeys(parent as JSONObject, documentState, compileJSONPointer(parentPath))
    const oldKey = last(selection.focusPath)
    const newKey = typeof clipboard === 'string' ? clipboard : clipboardText

    return rename(parentPath, keys, oldKey, newKey)
  }

  if (
    isValueSelection(selection) ||
    (isMultiSelection(selection) && isEmpty(selection.focusPath)) // root selected
  ) {
    // replace selected value (new value can be primitive or an array/object with contents)
    try {
      return [
        {
          op: 'replace',
          path: compileJSONPointer(selection.focusPath),
          value: parsePartialJson(clipboardText, parseAndRepair)
        }
      ]
    } catch (err) {
      // parsing failed -> just paste the raw text as value
      return [
        {
          op: 'replace',
          path: compileJSONPointer(selection.focusPath),
          value: clipboardText
        }
      ]
    }
  }

  if (isMultiSelection(selection)) {
    const newValues = clipboardToValues(clipboardText)

    return replace(json, documentState, selection.paths, newValues)
  }

  if (isAfterSelection(selection)) {
    const newValues = clipboardToValues(clipboardText)
    const path = selection.focusPath
    const parentPath: JSONPath = initial(path)
    const parent = getIn(json, parentPath)

    if (isJSONArray(parent)) {
      const index = last(path)
      const nextItemPath = parentPath.concat([(index as number) + 1])

      return insertBefore(json, documentState, nextItemPath, newValues)
    } else if (isJSONObject(parent)) {
      // value is an Object
      const key = String(last(path))
      const keys: string[] = getKeys(parent, documentState, compileJSONPointer(parentPath))
      if (isEmpty(keys) || last(keys) === key) {
        return append(json, parentPath, newValues)
      } else {
        const index = keys.indexOf(key)
        const nextKey = keys[index + 1]
        const nextKeyPath = parentPath.concat([nextKey])

        return insertBefore(json, documentState, nextKeyPath, newValues)
      }
    } else {
      throw new Error('Cannot create insert operations: parent must be an Object or Array')
    }
  }

  if (isInsideSelection(selection)) {
    const newValues = clipboardToValues(clipboardText)
    const path = selection.focusPath
    const value = getIn(json, path)

    if (isJSONArray(value)) {
      const firstItemPath = path.concat([0])
      return insertBefore(json, documentState, firstItemPath, newValues)
    } else if (isJSONObject(value)) {
      // value is an Object
      const keys: string[] = getKeys(value, documentState, compileJSONPointer(path))
      if (isEmpty(keys)) {
        return append(json, path, newValues)
      } else {
        const firstKey = first(keys)
        const firstKeyPath = path.concat([firstKey])

        return insertBefore(json, documentState, firstKeyPath, newValues)
      }
    } else {
      throw new Error('Cannot create insert operations: parent must be an Object or Array')
    }
  }

  // this should never happen
  throw new Error('Cannot insert: unsupported type of selection ' + JSON.stringify(selection))
}

export function moveInsideParent(
  json: JSONData,
  documentState: DocumentState,
  dragInsideAction: DragInsideAction
): JSONPatchDocument {
  const beforePath = dragInsideAction['beforePath']
  const append = dragInsideAction['append']

  const parentPath: Path = initial(documentState.selection.focusPath)
  const parent = getIn(json, parentPath as JSONPath)

  if (
    !append &&
    !(beforePath && pathStartsWith(beforePath, parentPath) && beforePath.length > parentPath.length)
  ) {
    return []
  }

  const startPath = getStartPath(documentState.selection)
  const endPath = getEndPath(documentState.selection)
  const startKey: string | number = last(startPath)
  const endKey: string | number = last(endPath)
  const toKey = beforePath ? beforePath[parentPath.length] : undefined

  if (isJSONObject(parent)) {
    const keys = getKeys(parent, documentState, compileJSONPointer(parentPath))
    const startIndex = keys.indexOf(startKey as string)
    const endIndex = keys.indexOf(endKey as string)
    const toIndex = append ? keys.length : keys.indexOf(toKey)

    if (startIndex !== -1 && endIndex !== -1 && toIndex !== -1) {
      if (toIndex > startIndex) {
        // moving down
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return [...keys.slice(startIndex, endIndex + 1), ...keys.slice(toIndex, keys.length)].map(
          (key) => moveDown(parentPath, key)
        )
      } else {
        // moving up
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return [...keys.slice(toIndex, startIndex), ...keys.slice(endIndex + 1, keys.length)].map(
          (key) => moveDown(parentPath, key)
        )
      }
    }
  } else if (isJSONArray(parent)) {
    // array
    const startIndex: number = startKey as number
    const endIndex: number = endKey as number
    const toIndex = toKey
    const count = endIndex - startIndex + 1

    if (toIndex < startIndex) {
      // move up
      return times(count, (offset) => {
        return {
          op: 'move',
          from: compileJSONPointer(parentPath.concat(startIndex + offset) as JSONPath),
          path: compileJSONPointer(parentPath.concat(toIndex + offset) as JSONPath)
        }
      })
    } else {
      // move down
      return times(count, () => {
        return {
          op: 'move',
          from: compileJSONPointer(parentPath.concat(startIndex) as JSONPath),
          path: compileJSONPointer(parentPath.concat(toIndex) as JSONPath)
        }
      })
    }
  } else {
    throw new Error('Cannot create move operations: parent must be an Object or Array')
  }
}

export function createNewValue(
  json: JSONData,
  selection: Selection,
  valueType: 'object' | 'array' | 'structure' | 'value'
) {
  if (valueType === 'object') {
    return {}
  }

  if (valueType === 'array') {
    return []
  }

  if (valueType === 'structure') {
    const parentPath = getParentPath(selection)
    const parent = getIn(json, parentPath)

    if (Array.isArray(parent) && !isEmpty(parent)) {
      const jsonExample = first(parent)
      if (isObjectOrArray(jsonExample)) {
        return cloneDeepWith(jsonExample, (value) => {
          return Array.isArray(value)
            ? []
            : isObject(value)
            ? undefined // leave object as is, will recurse into it
            : ''
        })
      } else {
        // just a primitive value
        return ''
      }
    }
  }

  // type === value,
  // or type === structure but the parent is no array or an array containing
  // primitive values (and no objects having any structure).
  return ''
}

/**
 * Create a JSONPatch for a remove operation
 */
export function remove(path: Path): JSONPatchDocument {
  return [
    {
      op: 'remove',
      path: compileJSONPointer(path)
    }
  ]
}

/**
 * Create a JSONPatch for a multiple remove operation
 */
export function removeAll(paths: Path[]): JSONPatchDocument {
  return paths
    .map((path) => {
      const operation: JSONPatchOperation = {
        op: 'remove',
        path: compileJSONPointer(path)
      }

      return operation
    })
    .reverse() // reverse is needed for arrays: delete the last index first
}

// helper function to move a key down in an object,
// so another key can get positioned before the moved down keys
function moveDown(parentPath: Path, key: string): JSONPatchOperation {
  return {
    op: 'move',
    from: compileJSONPointer(parentPath.concat(key)),
    path: compileJSONPointer(parentPath.concat(key))
  }
}

export function clipboardToValues(clipboardText: string): ClipboardValues {
  const textIsObject = /^\s*{/.test(clipboardText)
  const textIsArray = /^\s*\[/.test(clipboardText)

  const clipboardOriginal = parseAndRepairOrUndefined(clipboardText)
  const clipboardRepaired =
    clipboardOriginal !== undefined
      ? clipboardOriginal
      : parsePartialJson(clipboardText, parseAndRepair)

  if (
    (textIsObject && isObject(clipboardRepaired)) ||
    (textIsArray && Array.isArray(clipboardRepaired))
  ) {
    return [{ key: 'New item', value: clipboardRepaired }]
  }

  if (Array.isArray(clipboardRepaired)) {
    return clipboardRepaired.map((value, index) => {
      return { key: 'New item ' + index, value }
    })
  }

  if (isObject(clipboardRepaired)) {
    return Object.keys(clipboardRepaired).map((key) => {
      return { key, value: clipboardRepaired[key] }
    })
  }

  // regular value
  return [{ key: 'New item', value: clipboardRepaired }]
}

// TODO: write unit tests
export function createRemoveOperations(
  json: JSONData,
  documentState: DocumentState,
  selection: Selection
): { newSelection: Selection; operations: JSONPatchDocument } {
  if (isKeySelection(selection)) {
    // FIXME: DOESN'T work yet
    const parentPath = initial(selection.focusPath)
    const parent = getIn(json, parentPath)
    const keys = getKeys(parent as JSONObject, documentState, compileJSONPointer(parentPath))
    const oldKey = last(selection.focusPath)
    const newKey = ''

    const operations = rename(parentPath, keys, oldKey, newKey)
    const newSelection = createSelectionFromOperations(json, operations)

    return { operations, newSelection }
  }

  if (isValueSelection(selection)) {
    const operations: JSONPatchDocument = [
      {
        op: 'replace',
        path: compileJSONPointer(selection.focusPath),
        value: ''
      }
    ]

    return { operations, newSelection: selection }
  }

  if (isMultiSelection(selection)) {
    const operations = removeAll(selection.paths)
    const lastPath: JSONPath = last(selection.paths)

    if (isEmpty(lastPath)) {
      // there is no parent, this is the root document
      const operations: JSONPatchDocument = [{ op: 'replace', path: '', value: '' }]

      const newSelection = createValueSelection([], false)

      return { operations, newSelection }
    }

    const parentPath = initial(lastPath)
    const parent = getIn(json, parentPath)

    if (isJSONArray(parent)) {
      const firstPath: JSONPath = first(selection.paths)
      const index: number = last(firstPath) as number
      const newSelection =
        index === 0
          ? createInsideSelection(parentPath)
          : createAfterSelection(parentPath.concat([index - 1]))

      return { operations, newSelection }
    } else if (isJSONObject(parent)) {
      // parent is object
      const keys = getKeys(parent, documentState, compileJSONPointer(parentPath))
      const firstPath: JSONPath = first(selection.paths)
      const key: string = last(firstPath) as string
      const index = keys.indexOf(key)
      const previousKey = keys[index - 1]
      const newSelection =
        index === 0
          ? createInsideSelection(parentPath)
          : createAfterSelection(parentPath.concat([previousKey]))

      return { operations, newSelection }
    } else {
      throw new Error('Cannot create remove operations: parent must be an Object or Array')
    }
  }

  // this should never happen
  throw new Error('Cannot remove: unsupported type of selection ' + JSON.stringify(selection))
}
