import createDebug from 'debug'
import {
  compileJSONPointer,
  existsIn,
  getIn,
  immutableJSONPatch,
  setIn,
  updateIn
} from 'immutable-json-patch'
import { initial, isEqual, last, uniqueId } from 'lodash-es'
import {
  DEFAULT_VISIBLE_SECTIONS,
  STATE_EXPANDED,
  STATE_ID,
  STATE_KEYS,
  STATE_VISIBLE_SECTIONS
} from '../constants.js'
import { forEachIndex } from '../utils/arrayUtils.js'
import { parseJSONPointerWithArrayIndices } from '../utils/jsonPointer.js'
import { isObject } from '../utils/typeUtils.js'
import {
  currentRoundNumber,
  inVisibleSection,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'

const debug = createDebug('jsoneditor:documentState')

/**
 * Sync a state object with the json it belongs to: update keys, limit, and expanded state
 *
 * @param {JSON} json
 * @param {JSON | undefined} state
 * @param {Path} path
 * @param {function (path: Path) : boolean} expand
 * @param {boolean} [forceRefresh=false] if true, force refreshing the expanded state
 * @returns {JSON | undefined}
 */
// TODO: refactor syncState so we don't have to pass path=[] all the time, this is only used internally for recursiveness
export function syncState (json, state, path, expand, forceRefresh = false) {
  // TODO: this function can be made way more efficient if we pass prevState:
  //  when immutable, we can simply be done already when the state === prevState

  const updatedState = Array.isArray(json) ? [] : {}

  updatedState[STATE_ID] = (state && state[STATE_ID])
    ? state[STATE_ID]
    : uniqueId()

  if (isObject(json)) {
    updatedState[STATE_KEYS] = syncKeys(json, state && state[STATE_KEYS])

    updatedState[STATE_EXPANDED] = (state && !forceRefresh)
      ? state[STATE_EXPANDED]
      : expand(path)

    if (updatedState[STATE_EXPANDED]) {
      Object.keys(json).forEach(key => {
        const childJson = json[key]
        const childState = state && state[key]
        updatedState[key] = syncState(childJson, childState, path.concat(key), expand, forceRefresh)
      })
    }

    // FIXME: must create new id's in case of duplicate id's
  } else if (Array.isArray(json)) {
    updatedState[STATE_EXPANDED] = (state && !forceRefresh)
      ? state[STATE_EXPANDED]
      : expand(path)

    // note that we reset the visible items when the state is not expanded
    updatedState[STATE_VISIBLE_SECTIONS] = (state && updatedState[STATE_EXPANDED])
      ? (state[STATE_VISIBLE_SECTIONS] || DEFAULT_VISIBLE_SECTIONS)
      : DEFAULT_VISIBLE_SECTIONS

    if (updatedState[STATE_EXPANDED]) {
      updatedState[STATE_VISIBLE_SECTIONS].forEach(({ start, end }) => {
        forEachIndex(start, Math.min(json.length, end), index => {
          const childJson = json[index]
          const childState = state && state[index]
          updatedState[index] = syncState(childJson, childState, path.concat(index), expand, forceRefresh)
        })
      })
    }
  } else {
    // primitive value (string, number, boolean, null)
  }

  return updatedState
}

export function createState (json) {
  if (Array.isArray(json)) {
    const state = []

    state[STATE_ID] = uniqueId()
    state[STATE_EXPANDED] = false
    state[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS

    return state
  }

  if (isObject(json)) {
    const state = {}

    state[STATE_ID] = uniqueId()
    state[STATE_EXPANDED] = false
    state[STATE_KEYS] = Object.keys(json)

    return state
  }

  // primitive value
  return {
    [STATE_ID]: uniqueId()
  }
}

/**
 * Expand a node
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @return {JSON} returns the updated state
 */
export function expandSinglePath (json, state, path) {
  const value = getIn(json, path)

  if (isObject(value)) {
    return updateIn(state, path, objectState => {
      const updatedState = {}
      updatedState[STATE_ID] = objectState[STATE_ID]
      updatedState[STATE_EXPANDED] = true
      updatedState[STATE_KEYS] = Object.keys(value)

      forEachKey(objectState, key => {
        updatedState[key] = createState(value[key])
      })

      return updatedState
    })
  }

  if (Array.isArray(value)) {
    return updateIn(state, path, arrayState => {
      const updatedState = []
      updatedState[STATE_ID] = arrayState[STATE_ID]
      updatedState[STATE_EXPANDED] = true
      updatedState[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS

      forEachVisibleIndex(value, updatedState, (index) => {
        updatedState[index] = createState(value[index])
      })

      return updatedState
    })
  }

  return state
}

/**
 * Invoke a callback function for every visible item in the array
 * @param {JSON} json
 * @param {JSON} state
 * @param {function (index: number)} callback
 */
export function forEachVisibleIndex (json, state, callback) {
  state[STATE_VISIBLE_SECTIONS].forEach(({ start, end }) => {
    forEachIndex(start, Math.min(json.length, end), callback)
  })
}

// TODO: write unit tests
export function forEachKey (state, callback) {
  state[STATE_KEYS].forEach(key => callback(key))
}

/**
 * Expand all nodes on given path
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @return {JSON} returns the updated state
 */
// TODO: write unit tests for expandPath
export function expandPath (json, state, path) {
  let updatedState = state

  for (let i = 0; i < path.length; i++) {
    const partialPath = path.slice(0, i)
    const expandedPath = partialPath.concat(STATE_EXPANDED)
    updatedState = setIn(updatedState, expandedPath, true, true)

    // if needed, enlarge the expanded sections such that the search result becomes visible in the array
    if (Array.isArray(getIn(updatedState, partialPath))) {
      const key = path[i]
      const sectionsPath = partialPath.concat(STATE_VISIBLE_SECTIONS)
      const sections = getIn(updatedState, sectionsPath) || DEFAULT_VISIBLE_SECTIONS
      if (!inVisibleSection(sections, key)) {
        const start = currentRoundNumber(key)
        const end = nextRoundNumber(start)
        const newSection = { start, end }
        const updatedSections = mergeSections(sections.concat(newSection))
        updatedState = setIn(updatedState, sectionsPath, updatedSections)
      }
    }

    // FIXME: the way to sync the state of this nested, just expanded object/array is complicated. Refactor this
    const partialJson = getIn(json, partialPath)
    updatedState = updateIn(updatedState, partialPath, partialState => {
      return syncState(partialJson, partialState, [], () => false)
    })
  }

  return updatedState
}

/**
 * If needed, enlarge the expanded sections such that the search result becomes visible in the array
 * @param {JSON} state
 * @param {Path} path
 * @param {number} index
 * @returns {JSON}
 */
export function ensureItemIsVisible (state, path, index) {
  if (!Array.isArray(getIn(state, path))) {
    return state
  }

  const sections = getIn(state, path.concat(STATE_VISIBLE_SECTIONS))
  if (inVisibleSection(sections, index)) {
    return state
  }

  const start = currentRoundNumber(index)
  const end = nextRoundNumber(start)
  const newSection = { start, end }
  const updatedSections = mergeSections(sections.concat(newSection))
  return setIn(state, path.concat(STATE_VISIBLE_SECTIONS), updatedSections)
}

// TODO: write unit tests
export function expandRecursively (json, state, path) {
  const childJson = getIn(json, path)

  return updateIn(state, path, childState => {
    return _expandRecursively(childJson, childState)
  })
}

function _expandRecursively (json, state) {
  if (isObject(json)) {
    let updatedState = expandSinglePath(json, state, [])

    forEachKey(updatedState, (key) => {
      const updatedChildState = _expandRecursively(json[key], updatedState[key])
      updatedState = setIn(updatedState, [key], updatedChildState)
    })

    return updatedState
  }

  if (Array.isArray(json)) {
    let updatedState = expandSinglePath(json, state, [])

    forEachVisibleIndex(json, updatedState, (index) => {
      const updatedChildState = _expandRecursively(json[index], updatedState[index])
      updatedState = setIn(updatedState, [index], updatedChildState)
    })

    return updatedState
  }

  return state
}

/**
 * Collapse the node at given path
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @returns {JSON} returns the updated state
 */
export function collapseSinglePath (json, state, path) {
  const value = getIn(json, path)

  if (Array.isArray(value)) {
    return updateIn(state, path, arrayState => {
      const updatedState = []
      updatedState[STATE_ID] = arrayState[STATE_ID]
      updatedState[STATE_EXPANDED] = false
      updatedState[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS // reset visible sections
      return updatedState
    })
  }

  if (isObject(value)) {
    return updateIn(state, path, objectState => {
      const updatedState = {}
      updatedState[STATE_ID] = objectState[STATE_ID]
      updatedState[STATE_EXPANDED] = false
      updatedState[STATE_KEYS] = objectState[STATE_KEYS] // keep order of keys
      return updatedState
    })
  }

  return state
}

/**
 * Expand a section of items in an array
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @param {Section} section
 * @return {JSON} returns the updated state
 */
// TODO: write unit test
export function expandSection (json, state, path, section) {
  const updatedState = updateIn(state, path.concat(STATE_VISIBLE_SECTIONS), (sections) => {
    return mergeSections(sections.concat(section))
  })

  // instantiate all new expanded items
  return syncState(json, updatedState, path, () => false)
}

/**
 * @param {Object} object
 * @param {string[]} [prevKeys=undefined]
 * @returns {string[]}
 */
export function syncKeys (object, prevKeys) {
  if (!prevKeys) {
    return Object.keys(object)
  }

  // copy the keys that still exist
  const keys = prevKeys.filter(key => object[key] !== undefined)

  // add new keys
  const keysSet = new Set(keys)
  Object.keys(object)
    .filter(key => !keysSet.has(key))
    .forEach(key => keys.push(key))

  return keys
}

/**
 * Apply patch operations to both json and state
 * @param {JSON} json
 * @param {JSON} state
 * @param {JSONPatchDocument} operations
 * @returns {{json: JSON, state: JSON}}
 */
export function documentStatePatch (json, state, operations) {
  // TODO: split this function in smaller functions, it's too large

  function before (state, operation) {
    const { op, path, from } = operation
    const parentPath = initial(path)

    let updatedState = state
    let updatedOperation = operation

    // correctly create state value
    if (operation.value !== undefined) {
      updatedOperation = {
        ...updatedOperation,
        value: createState(operation.value)
      }
    }

    // TODO: when path or from is not existing in updatedState, expand that now so we can handle it

    if (op === 'add' || op === 'copy') {
      const keys = getKeys(state, parentPath)
      if (keys) {
        // this is a property inside an object
        // add the key to STATE_KEYS if needed
        const key = last(path)
        if (!keys.includes(key)) {
          updatedState = appendToKeys(updatedState, parentPath, key)
        }
      }

      // shift the visible sections one down
      updatedState = shiftVisibleSections(updatedState, path, 1)
    }

    if (op === 'move') {
      const parentPath = initial(path)
      const keys = getKeys(updatedState, parentPath)
      const oldKey = last(from)
      const newKey = last(path)

      if (isEqual(initial(from), initial(path))) {
        // move inside the same object
        if (keys) {
          if (oldKey !== newKey) {
            // A key is renamed

            // in case the new key is different but will replace an existing key, remove the existing key
            updatedState = removeFromKeys(updatedState, parentPath, newKey)

            // Replace the key in the object's STATE_KEYS so it maintains its index
            updatedState = replaceInKeys(updatedState, parentPath, oldKey, newKey)
          } else {
            // key is not renamed but moved -> move it to the end of the keys
            updatedState = removeFromKeys(updatedState, parentPath, newKey)
            updatedState = appendToKeys(updatedState, parentPath, newKey)
          }
        }
      } else {
        // move from one object/array to an other -> remove old key, add new key
        const fromParentPath = initial(from)
        const fromKeys = getKeys(updatedState, fromParentPath)
        if (fromKeys) {
          updatedState = removeFromKeys(updatedState, fromParentPath, oldKey)
        }
        if (keys) {
          updatedState = appendToKeys(updatedState, parentPath, newKey)
        }
      }

      // shift the visible sections one up from where removed, and one down from where inserted
      updatedState = shiftVisibleSections(updatedState, from, -1)
      updatedState = shiftVisibleSections(updatedState, path, 1)

      // we must keep the existing state for example when renaming an object property
      const existingState = getIn(state, from)
      updatedOperation = { ...updatedOperation, value: existingState }
    }

    if (op === 'remove') {
      const parentPath = initial(path)
      const keys = getKeys(updatedState, parentPath)
      if (keys) {
        // remove old key
        const oldKey = last(path)
        updatedState = removeFromKeys(updatedState, parentPath, oldKey)
      } else {
        // shift the visible sections one up
        updatedState = shiftVisibleSections(updatedState, path, -1)
      }
    }

    if (op === 'replace') {
      const parentPath = initial(path)
      const keys = getKeys(updatedState, parentPath)
      if (keys) {
        const key = last(path)
        if (!keys.includes(key)) {
          updatedState = appendToKeys(updatedState, parentPath, key)
        }
      }
    }

    return {
      json: updatedState,
      operation: updatedOperation
    }
  }

  function after (state, operation) {
    const { op, path } = operation

    let updatedState = state

    if (op === 'copy') {
      // copying state will introduce duplicate id's -> replace with a new id
      if (existsIn(updatedState, path.concat([STATE_ID]))) {
        updatedState = setIn(updatedState, path.concat([STATE_ID]), uniqueId())
      }
    }

    return updatedState
  }

  debug('documentStatePatch', json, state, operations)

  const updatedJson = immutableJSONPatch(json, operations)
  const initializedState = initializeState(json, state, operations)
  const updatedState = immutableJSONPatch(initializedState, operations, { before, after })

  return {
    json: updatedJson,
    state: updatedState
  }
}

/**
 * Initialize the state needed to perform the JSON patch operations.
 * For example to a change in a nested object which is not expanded and
 * hence has no state initialize, we need to create this nested state
 * @param {JSON} json
 * @param {JSON} state
 * @param {JSONPatchDocument} operations
 */
export function initializeState (json, state, operations) {
  let updatedState = state

  function initializePath (json, state, path) {
    let updatedState = state

    if (existsIn(json, path) && !existsIn(updatedState, path)) {
      // first make sure the parent is initialized
      if (path.length > 0) {
        updatedState = initializePath(json, updatedState, initial(path))
      }

      // then initialize the state itself
      updatedState = setIn(updatedState, path, createState(getIn(json, path)))
    }

    return updatedState
  }

  operations.forEach(operation => {
    const from = typeof operation.from === 'string'
      ? parseJSONPointerWithArrayIndices(json, operation.from)
      : null
    const path = typeof operation.path === 'string'
      ? parseJSONPointerWithArrayIndices(json, operation.path)
      : null

    if (operation.op === 'add') {
      updatedState = initializePath(json, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'copy' || operation.op === 'move') {
      updatedState = initializePath(json, updatedState, from)
      updatedState = initializePath(json, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'remove' || operation.op === 'replace' || operation.op === 'test') {
      updatedState = initializePath(json, updatedState, path)
    }
  })

  return updatedState
}

/**
 * Shift visible sections in an Array with a specified offset
 * @param {JSON} state
 * @param {Path} path
 * @param {number} offset
 * @returns {JSON} Returns the updated state
 */
export function shiftVisibleSections (state, path, offset) {
  const parentPath = initial(path)
  const sectionsPath = parentPath.concat([STATE_VISIBLE_SECTIONS])
  const visibleSections = getIn(state, sectionsPath)
  if (!visibleSections) {
    // nothing to do, this is no object but an array apparently :)
    return state
  }

  const index = parseInt(last(path), 10)
  const shiftedVisibleSections = visibleSections.map(section => {
    return {
      start: section.start > index
        ? section.start + offset
        : section.start,

      end: section.end >= index
        ? section.end + offset
        : section.end
    }
  })

  return setIn(state, sectionsPath, shiftedVisibleSections)
}

/**
 * @param {JSON} state
 * @param {Path} path
 * @return {string[]}
 */
export function getKeys (state, path) {
  return getIn(state, path.concat([STATE_KEYS]))
}

/**
 * @param {JSON} state
 * @param {Path} path
 * @return {boolean}
 */
// TODO: write unit tests
export function isExpanded (state, path) {
  return getIn(state, path.concat([STATE_EXPANDED])) === true
}

/**
 * @param {JSON} state
 * @param {Path} path
 * @param {string} key
 * @return {JSON} Returns the updated state
 */
export function removeFromKeys (state, path, key) {
  return updateIn(state, path.concat([STATE_KEYS]), keys => {
    const index = keys.indexOf(key)
    if (index === -1) {
      return keys
    }

    const updatedKeys = keys.slice(0)
    updatedKeys.splice(index, 1)

    return updatedKeys
  })
}

/**
 * @param {JSON} state
 * @param {Path} path
 * @param {string} oldKey
 * @param {string} newKey
 * @return {JSON} Returns the updated state
 */
export function replaceInKeys (state, path, oldKey, newKey) {
  return updateIn(state, path.concat([STATE_KEYS]), keys => {
    const index = keys.indexOf(oldKey)
    if (index === -1) {
      return keys
    }

    const updatedKeys = keys.slice(0)
    updatedKeys.splice(index, 1, newKey)

    return updatedKeys
  })
}

/**
 * @param {JSON} state
 * @param {Path} path
 * @param {string} key
 * @return {JSON} Returns the updated state
 */
export function appendToKeys (state, path, key) {
  return updateIn(state, path.concat([STATE_KEYS]), keys => keys.concat(key))
}

export function getNextKeys (keys, key, includeKey = false) {
  const index = keys.indexOf(key)
  if (index !== -1) {
    return includeKey
      ? keys.slice(index)
      : keys.slice(index + 1)
  } else {
    // a new key, that doesn't have next keys
    return []
  }
}

/**
 * Get all paths which are visible and rendered
 * @param {JSON} json
 * @param {JSON} state
 * @returns {Path[]}
 */
// TODO: create memoized version of getVisiblePaths which remembers just the previous result if json and state are the same
export function getVisiblePaths (json, state) {
  const paths = []

  function _recurse (json, state, path) {
    paths.push(path)

    if (json && state && state[STATE_EXPANDED] === true) {
      if (Array.isArray(json)) {
        forEachVisibleIndex(json, state, index => {
          _recurse(json[index], state[index], path.concat(index))
        })
      } else { // Object
        forEachKey(state, key => {
          _recurse(json[key], state[key], path.concat(key))
        })
      }
    }
  }

  _recurse(json, state, [])

  return paths
}

export const CARET_POSITION = {
  INSIDE: 'inside',
  AFTER: 'after',
  KEY: 'key',
  VALUE: 'value'
}

/**
 * Get all caret position which are visible and rendered:
 * before a node, at a key, at a value, appending an object/arrayc
 * @param {JSON} json
 * @param {JSON} state
 * @param {boolean} [includeInside=true]
 * @returns {CaretPosition[]}
 */
// TODO: create memoized version of getVisibleCaretPositions which remembers just the previous result if json and state are the same
export function getVisibleCaretPositions (json, state, includeInside = true) {
  const paths = []

  function _recurse (json, state, path) {
    paths.push({ path, type: CARET_POSITION.VALUE })

    if (json && state && state[STATE_EXPANDED] === true) {
      if (includeInside) {
        paths.push({ path, type: CARET_POSITION.INSIDE })
      }

      if (Array.isArray(json)) {
        forEachVisibleIndex(json, state, index => {
          const itemPath = path.concat(index)

          _recurse(json[index], state[index], itemPath)

          if (includeInside) {
            paths.push({ path: itemPath, type: CARET_POSITION.AFTER })
          }
        })
      } else { // Object
        forEachKey(state, key => {
          const propertyPath = path.concat(key)

          paths.push({ path: propertyPath, type: CARET_POSITION.KEY })

          _recurse(json[key], state[key], propertyPath)

          if (includeInside) {
            paths.push({ path: propertyPath, type: CARET_POSITION.AFTER })
          }
        })
      }
    }
  }

  _recurse(json, state, [])

  return paths
}

/**
 * Find the previous visible path.
 * This can be the last child of the previous object or array, or the parent of a first entry.
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @return {Path | null}
 */
// TODO: write tests for getPreviousVisiblePath
export function getPreviousVisiblePath (json, state, path) {
  const visiblePaths = getVisiblePaths(json, state)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const pathPointer = compileJSONPointer(path)
  const index = visiblePathPointers.indexOf(pathPointer)

  if (index !== -1 && index > 0) {
    return visiblePaths[index - 1]
  }

  return null
}

/**
 * Find the next visible path.
 * This can be the next parent entry.
 * @param {JSON} json
 * @param {JSON} state
 * @param {Path} path
 * @return {Path | null} path
 */
// TODO: write tests for getNextVisiblePath
export function getNextVisiblePath (json, state, path) {
  const visiblePaths = getVisiblePaths(json, state)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const index = visiblePathPointers.indexOf(compileJSONPointer(path))

  if (index !== -1 && index < visiblePaths.length - 1) {
    return visiblePaths[index + 1]
  }

  return null
}
