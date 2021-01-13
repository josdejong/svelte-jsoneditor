import { cloneDeepWith, first, initial, isEmpty, last } from 'lodash-es'
import { getIn } from '../utils/immutabilityHelpers.js'
import { compileJSONPointer } from '../utils/jsonPointer.js'
import {
  parseAndRepair,
  parseAndRepairOrUndefined,
  parsePartialJson
} from '../utils/jsonUtils.js'
import { findUniqueName } from '../utils/stringUtils.js'
import { isObject, isObjectOrArray } from '../utils/typeUtils.js'
import { getKeys, getNextKeys } from './documentState.js'
import {
  createSelection,
  createSelectionFromOperations,
  getParentPath,
  SELECTION_TYPE
} from './selection.js'

/**
 * Create a JSONPatch for an insert operation.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the inserted node in case of duplicating
 * and object property
 *
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @param {ClipboardValues} values
 * @return {JSONPatchDocument}
 */
// TODO: write tests
export function insertBefore (doc, state, path, values) { // TODO: find a better name and define datastructure for values
  const parentPath = initial(path)
  const parent = getIn(doc, parentPath)

  if (Array.isArray(parent)) {
    // the path is parsed from a JSONPatch operation,
    // so array indices are a string which we have to parse into a number
    const offset = parseInt(last(path), 10)
    return values.map((entry, index) => ({
      op: 'add',
      path: compileJSONPointer(parentPath.concat(offset + index)),
      value: entry.value
    }))
  } else { // 'object'
    const afterKey = last(path)
    const keys = getKeys(state, parentPath)
    const nextKeys = getNextKeys(keys, afterKey, true)

    return [
      // insert new values
      ...values.map(entry => {
        const newProp = findUniqueName(entry.key, keys)
        return {
          op: 'add',
          path: compileJSONPointer(parentPath.concat(newProp)),
          value: entry.value
        }
      }),

      // move all lower down keys so the inserted key will maintain it's position
      ...nextKeys.map(key => moveDown(parentPath, key))
    ]
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
export function append (json, path, values) { // TODO: find a better name and define datastructure for values
  const parent = getIn(json, path)

  if (Array.isArray(parent)) {
    const offset = parent.length
    return values.map((entry, index) => ({
      op: 'add',
      path: compileJSONPointer(path.concat(offset + index)),
      value: entry.value
    }))
  } else { // 'object'
    return values.map(entry => {
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
export function rename (parentPath, keys, oldKey, newKey) {
  const filteredKeys = keys.filter(key => key !== oldKey)
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
    ...nextKeys.map(key => moveDown(parentPath, key))
  ]
}

/**
 * Create a JSONPatch for an insert operation.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the inserted node in case of duplicating
 * and object property
 *
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path[]} paths
 * @param {ClipboardValues} values
 * @return {JSONPatchDocument}
 */
export function replace (doc, state, paths, values) { // TODO: find a better name and define datastructure for values
  const firstPath = first(paths)
  const parentPath = initial(firstPath)
  const parent = getIn(doc, parentPath)

  if (Array.isArray(parent)) {
    const firstPath = first(paths)
    const offset = firstPath ? parseInt(last(firstPath), 10) : 0

    return [
      // remove operations
      ...removeAll(paths),

      // insert operations
      ...values.map((entry, index) => ({
        op: 'add',
        path: compileJSONPointer(parentPath.concat(index + offset)),
        value: entry.value
      }))
    ]
  } else { // parent is Object
    // if we're going to replace an existing object with key "a" with a new
    // key "a", we must not create a new unique name "a (copy)".
    const lastPath = last(paths)
    const parentPath = initial(lastPath)
    const beforeKey = last(lastPath)
    const keys = getKeys(state, parentPath)
    const nextKeys = getNextKeys(keys, beforeKey, false)
    const removeKeys = new Set(paths.map(path => last(path)))
    const filteredKeys = keys.filter(key => !removeKeys.has(key))

    return [
      // remove operations
      ...removeAll(paths),

      // insert operations
      ...values.map(entry => {
        const newProp = findUniqueName(entry.key, filteredKeys)
        return {
          op: 'add',
          path: compileJSONPointer(parentPath.concat(newProp)),
          value: entry.value
        }
      }),

      // move down operations
      // move all lower down keys so the renamed key will maintain it's position
      ...nextKeys.map(key => moveDown(parentPath, key))
    ]
  }
}

/**
 * Create a JSONPatch for a duplicate action.
 *
 * This function needs the current data in order to be able to determine
 * a unique property name for the duplicated node in case of duplicating
 * and object property
 *
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path[]} paths
 * @return {JSONPatchDocument}
 */
export function duplicate (doc, state, paths) {
  // FIXME: here we assume selection.paths is sorted correctly, that's a dangerous assumption
  const lastPath = last(paths)

  if (isEmpty(lastPath)) {
    throw new Error('Cannot duplicate root object')
  }

  const parentPath = initial(lastPath)
  const beforeKey = last(lastPath)
  const parent = getIn(doc, parentPath)

  if (Array.isArray(parent)) {
    const lastPath = last(paths)
    const offset = lastPath ? (parseInt(last(lastPath), 10) + 1) : 0

    return [
      // copy operations
      ...paths.map((path, index) => ({
        op: 'copy',
        from: compileJSONPointer(path),
        path: compileJSONPointer(parentPath.concat(index + offset))
      }))
    ]
  } else { // 'object'
    const keys = getKeys(state, parentPath)
    const nextKeys = getNextKeys(keys, beforeKey, false)

    return [
      // copy operations
      ...paths.map(path => {
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
      ...nextKeys.map(key => moveDown(parentPath, key))
    ]
  }
}

/**
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Selection} selection
 * @param {string} clipboardText
 * @return {JSONPatchDocument}
 */
// TODO: write unit tests
export function insert (doc, state, selection, clipboardText) {
  if (selection.type === SELECTION_TYPE.KEY) {
    // rename key
    const clipboard = parseAndRepairOrUndefined(clipboardText)
    const parentPath = initial(selection.focusPath)
    const keys = getKeys(state, parentPath)
    const oldKey = last(selection.focusPath)
    const newKey = typeof clipboard === 'string'
      ? clipboard
      : clipboardText

    return rename(parentPath, keys, oldKey, newKey)
  }

  if (
    selection.type === SELECTION_TYPE.VALUE ||
    (selection.type === SELECTION_TYPE.MULTI && isEmpty(selection.focusPath)) // root selected
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

  if (selection.type === SELECTION_TYPE.MULTI) {
    const newValues = clipboardToValues(clipboardText)

    return replace(doc, state, selection.paths, newValues)
  }

  if (selection.type === SELECTION_TYPE.AFTER) {
    const newValues = clipboardToValues(clipboardText)
    const path = selection.focusPath
    const parentPath = initial(path)
    const parent = getIn(doc, parentPath)

    if (Array.isArray(parent)) {
      const index = last(path)
      const nextItemPath = parentPath.concat([index + 1])

      return insertBefore(doc, state, nextItemPath, newValues)
    } else { // value is an Object
      const key = last(path)
      const keys = getKeys(state, parentPath)
      if (isEmpty(keys) || last(keys) === key) {
        return append(doc, parentPath, newValues)
      } else {
        const index = keys.indexOf(key)
        const nextKey = keys[index + 1]
        const nextKeyPath = parentPath.concat([nextKey])

        return insertBefore(doc, state, nextKeyPath, newValues)
      }
    }
  }

  if (selection.type === SELECTION_TYPE.INSIDE) {
    const newValues = clipboardToValues(clipboardText)
    const path = selection.focusPath
    const value = getIn(doc, path)

    if (Array.isArray(value)) {
      const firstItemPath = path.concat([0])
      return insertBefore(doc, state, firstItemPath, newValues)
    } else { // value is an Object
      const keys = getKeys(state, path)
      if (isEmpty(keys)) {
        return append(doc, path, newValues)
      } else {
        const firstKey = first(keys)
        const firstKeyPath = path.concat([firstKey])

        return insertBefore(doc, state, firstKeyPath, newValues)
      }
    }
  }

  // this should never happen
  throw new Error('Cannot insert: unsupported type of selection ' + JSON.stringify(selection))
}

export function createNewValue (doc, selection, type) {
  if (type === 'object') {
    return {}
  }

  if (type === 'array') {
    return []
  }

  if (type === 'structure') {
    const parentPath = getParentPath(selection)
    const parent = getIn(doc, parentPath)

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
 * @param {Path} path
 * @return {JSONPatchDocument}
 */
export function remove (path) {
  return [{
    op: 'remove',
    path: compileJSONPointer(path)
  }]
}

/**
 * Create a JSONPatch for a multiple remove operation
 * @param {Path[]} paths
 * @return {JSONPatchDocument}
 */
export function removeAll (paths) {
  return paths
    .map(path => ({
      op: 'remove',
      path: compileJSONPointer(path)
    }))
    .reverse() // reverse is needed for arrays: delete the last index first
}

// helper function to move a key down in an object,
// so another key can get positioned before the moved down keys
function moveDown (parentPath, key) {
  return {
    op: 'move',
    from: compileJSONPointer(parentPath.concat(key)),
    path: compileJSONPointer(parentPath.concat(key))
  }
}

/**
 * @param {string} clipboardText
 * @returns {Array.<{key: string, value: *}>}
 */
export function clipboardToValues (clipboardText) {
  // clipboardOriginal must not fix partial JSON, we need clipboardOriginal
  // mostly to determine whether the original JSON was an object/array or not
  const clipboardOriginal = parseAndRepairOrUndefined(clipboardText)
  const clipboardRepaired = clipboardOriginal !== undefined
    ? clipboardOriginal // just performance optimization
    : parsePartialJson(clipboardText, parseAndRepair)

  if (isObjectOrArray(clipboardOriginal)) {
    return [{ key: 'New item', value: clipboardRepaired }]
  }

  if (Array.isArray(clipboardRepaired)) {
    return clipboardRepaired.map((value, index) => {
      return { key: 'New item ' + index, value }
    })
  }

  if (isObject(clipboardRepaired)) {
    return Object.keys(clipboardRepaired).map(key => {
      return { key, value: clipboardRepaired[key] }
    })
  }

  // regular value
  return [
    { key: 'New item', value: clipboardRepaired }
  ]
}

/**
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Selection} selection
 * @returns {{newSelection: Selection, operations: JSONPatchDocument}}
 */
// TODO: write unit tests
export function createRemoveOperations (doc, state, selection) {
  if (selection.type === SELECTION_TYPE.KEY) {
    // FIXME: DOESN'T work yet
    const parentPath = initial(selection.focusPath)
    const keys = getKeys(state, parentPath)
    const oldKey = last(selection.focusPath)
    const newKey = ''

    const operations = rename(parentPath, keys, oldKey, newKey)
    const newSelection = createSelectionFromOperations(doc, operations)

    return { operations, newSelection }
  }

  if (selection.type === SELECTION_TYPE.VALUE) {
    const operations = [{
      op: 'replace',
      path: compileJSONPointer(selection.focusPath),
      value: ''
    }]

    return { operations, newSelection: selection }
  }

  if (selection.type === SELECTION_TYPE.MULTI) {
    const operations = removeAll(selection.paths)
    const lastPath = last(selection.paths)

    if (isEmpty(lastPath)) {
      // there is no parent, this is the root document
      const operations = [{ op: 'replace', path: '', value: '' }]

      const newSelection = createSelection(doc, state, {
        type: SELECTION_TYPE.VALUE,
        path: []
      })

      return { operations, newSelection }
    }

    const parentPath = initial(lastPath)
    const parent = getIn(doc, parentPath)

    if (Array.isArray(parent)) {
      const firstPath = first(selection.paths)
      const index = last(firstPath)
      const newSelection = index === 0
        ? createSelection(doc, state, {
            type: SELECTION_TYPE.INSIDE,
            path: parentPath
          })
        : createSelection(doc, state, {
          type: SELECTION_TYPE.AFTER,
          path: parentPath.concat([index - 1])
        })

      return { operations, newSelection }
    } else { // parent is object
      const keys = getKeys(state, parentPath)
      const firstPath = first(selection.paths)
      const key = last(firstPath)
      const index = keys.indexOf(key)
      const previousKey = keys[index - 1]
      const newSelection = index === 0
        ? createSelection(doc, state, {
            type: SELECTION_TYPE.INSIDE,
            path: parentPath
          })
        : createSelection(doc, state, {
          type: SELECTION_TYPE.AFTER,
          path: parentPath.concat([previousKey])
        })

      return { operations, newSelection }
    }
  }

  // this should never happen
  throw new Error('Cannot remove: unsupported type of selection ' + JSON.stringify(selection))
}
