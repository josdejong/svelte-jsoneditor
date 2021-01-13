import createDebug from 'debug'
import { immutableJSONPatch } from 'immutable-json-patch'
import { initial, isEqual, last, uniqueId } from 'lodash-es'
import {
  DEFAULT_VISIBLE_SECTIONS,
  STATE_EXPANDED,
  STATE_ID,
  STATE_KEYS,
  STATE_VISIBLE_SECTIONS
} from '../constants.js'
import { forEachIndex } from '../utils/arrayUtils.js'
import {
  existsIn,
  getIn,
  setIn,
  updateIn
} from '../utils/immutabilityHelpers.js'
import {
  compileJSONPointer,
  parseJSONPointerWithArrayIndices
} from '../utils/jsonPointer.js'
import { isObject } from '../utils/typeUtils.js'
import {
  currentRoundNumber,
  inVisibleSection,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'

const debug = createDebug('jsoneditor:documentState')

/**
 * Sync a state object with the doc it belongs to: update keys, limit, and expanded state
 *
 * @param {JSON} doc
 * @param {JSON | undefined} state
 * @param {Path} path
 * @param {function (path: Path) : boolean} expand
 * @param {boolean} [forceRefresh=false] if true, force refreshing the expanded state
 * @returns {JSON | undefined}
 */
// TODO: refactor syncState so we don't have to pass path=[] all the time, this is only used internally for recursiveness
export function syncState (doc, state, path, expand, forceRefresh = false) {
  // TODO: this function can be made way more efficient if we pass prevState:
  //  when immutable, we can simply be done already when the state === prevState

  const updatedState = Array.isArray(doc) ? [] : {}

  updatedState[STATE_ID] = (state && state[STATE_ID])
    ? state[STATE_ID]
    : uniqueId()

  if (isObject(doc)) {
    updatedState[STATE_KEYS] = syncKeys(doc, state && state[STATE_KEYS])

    updatedState[STATE_EXPANDED] = (state && !forceRefresh)
      ? state[STATE_EXPANDED]
      : expand(path)

    if (updatedState[STATE_EXPANDED]) {
      Object.keys(doc).forEach(key => {
        const childDocument = doc[key]
        const childState = state && state[key]
        updatedState[key] = syncState(childDocument, childState, path.concat(key), expand, forceRefresh)
      })
    }

    // FIXME: must create new id's in case of duplicate id's
  } else if (Array.isArray(doc)) {
    updatedState[STATE_EXPANDED] = (state && !forceRefresh)
      ? state[STATE_EXPANDED]
      : expand(path)

    // note that we reset the visible items when the state is not expanded
    updatedState[STATE_VISIBLE_SECTIONS] = (state && updatedState[STATE_EXPANDED])
      ? (state[STATE_VISIBLE_SECTIONS] || DEFAULT_VISIBLE_SECTIONS)
      : DEFAULT_VISIBLE_SECTIONS

    if (updatedState[STATE_EXPANDED]) {
      updatedState[STATE_VISIBLE_SECTIONS].forEach(({ start, end }) => {
        forEachIndex(start, Math.min(doc.length, end), index => {
          const childDocument = doc[index]
          const childState = state && state[index]
          updatedState[index] = syncState(childDocument, childState, path.concat(index), expand, forceRefresh)
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
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @return {JSON} returns the updated state
 */
export function expandSinglePath (doc, state, path) {
  const value = getIn(doc, path)

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
 * @param {JSON} doc
 * @param {JSON} state
 * @param {function (index: number)} callback
 */
export function forEachVisibleIndex (doc, state, callback) {
  state[STATE_VISIBLE_SECTIONS].forEach(({ start, end }) => {
    forEachIndex(start, Math.min(doc.length, end), callback)
  })
}

// TODO: write unit tests
export function forEachKey (state, callback) {
  state[STATE_KEYS].forEach(key => callback(key))
}

/**
 * Expand all nodes on given path
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @return {JSON} returns the updated state
 */
// TODO: write unit tests for expandPath
export function expandPath (doc, state, path) {
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
    const partialDoc = getIn(doc, partialPath)
    updatedState = updateIn(updatedState, partialPath, partialState => {
      return syncState(partialDoc, partialState, [], () => false)
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
export function expandRecursively (doc, state, path) {
  const childDoc = getIn(doc, path)

  return updateIn(state, path, childState => {
    return _expandRecursively(childDoc, childState)
  })
}

function _expandRecursively (doc, state) {
  if (isObject(doc)) {
    let updatedState = expandSinglePath(doc, state, [])

    forEachKey(updatedState, (key) => {
      const updatedChildState = _expandRecursively(doc[key], updatedState[key])
      updatedState = setIn(updatedState, [key], updatedChildState)
    })

    return updatedState
  }

  if (Array.isArray(doc)) {
    let updatedState = expandSinglePath(doc, state, [])

    forEachVisibleIndex(doc, updatedState, (index) => {
      const updatedChildState = _expandRecursively(doc[index], updatedState[index])
      updatedState = setIn(updatedState, [index], updatedChildState)
    })

    return updatedState
  }

  return state
}

/**
 * Collapse the node at given path
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @returns {JSON} returns the updated state
 */
export function collapseSinglePath (doc, state, path) {
  const value = getIn(doc, path)

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
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @param {Section} section
 * @return {JSON} returns the updated state
 */
// TODO: write unit test
export function expandSection (doc, state, path, section) {
  const updatedState = updateIn(state, path.concat(STATE_VISIBLE_SECTIONS), (sections) => {
    return mergeSections(sections.concat(section))
  })

  // instantiate all new expanded items
  return syncState(doc, updatedState, path, () => false)
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
 * Apply patch operations to both doc and state
 * @param {JSON} doc
 * @param {JSON} state
 * @param {JSONPatchDocument} operations
 * @returns {{doc: JSON, state: JSON}}
 */
export function documentStatePatch (doc, state, operations) {
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

  debug('documentStatePatch', doc, state, operations)

  const updatedDoc = immutableJSONPatch(doc, operations)
  const initializedState = initializeState(doc, state, operations)
  const updatedState = immutableJSONPatch(initializedState, operations, { before, after })

  return {
    doc: updatedDoc,
    state: updatedState
  }
}

/**
 * Initialize the state needed to perform the JSON patch operations.
 * For example to a change in a nested object which is not expanded and
 * hence has no state initialize, we need to create this nested state
 * @param {JSON} doc
 * @param {JSON} state
 * @param {JSONPatchDocument} operations
 */
export function initializeState (doc, state, operations) {
  let updatedState = state

  function initializePath (doc, state, path) {
    let updatedState = state

    if (existsIn(doc, path) && !existsIn(updatedState, path)) {
      // first make sure the parent is initialized
      if (path.length > 0) {
        updatedState = initializePath(doc, updatedState, initial(path))
      }

      // then initialize the state itself
      updatedState = setIn(updatedState, path, createState(getIn(doc, path)))
    }

    return updatedState
  }

  operations.forEach(operation => {
    const from = typeof operation.from === 'string'
      ? parseJSONPointerWithArrayIndices(doc, operation.from)
      : null
    const path = typeof operation.path === 'string'
      ? parseJSONPointerWithArrayIndices(doc, operation.path)
      : null

    if (operation.op === 'add') {
      updatedState = initializePath(doc, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'copy' || operation.op === 'move') {
      updatedState = initializePath(doc, updatedState, from)
      updatedState = initializePath(doc, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'remove' || operation.op === 'replace' || operation.op === 'test') {
      updatedState = initializePath(doc, updatedState, path)
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
 * @param {JSON} doc
 * @param {JSON} state
 * @returns {Path[]}
 */
// TODO: create memoized version of getVisiblePaths which remembers just the previous result if doc and state are the same
export function getVisiblePaths (doc, state) {
  const paths = []

  function _recurse (doc, state, path) {
    paths.push(path)

    if (doc && state && state[STATE_EXPANDED] === true) {
      if (Array.isArray(doc)) {
        forEachVisibleIndex(doc, state, index => {
          _recurse(doc[index], state[index], path.concat(index))
        })
      } else { // Object
        forEachKey(state, key => {
          _recurse(doc[key], state[key], path.concat(key))
        })
      }
    }
  }

  _recurse(doc, state, [])

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
 * @param {JSON} doc
 * @param {JSON} state
 * @returns {CaretPosition[]}
 */
// TODO: create memoized version of getVisibleCaretPositions which remembers just the previous result if doc and state are the same
export function getVisibleCaretPositions (doc, state) {
  const paths = []

  function _recurse (doc, state, path) {
    paths.push({ path, type: CARET_POSITION.VALUE })

    if (doc && state && state[STATE_EXPANDED] === true) {
      paths.push({ path, type: CARET_POSITION.INSIDE })

      if (Array.isArray(doc)) {
        forEachVisibleIndex(doc, state, index => {
          const itemPath = path.concat(index)

          _recurse(doc[index], state[index], itemPath)
          paths.push({ path: itemPath, type: CARET_POSITION.AFTER })
        })
      } else { // Object
        forEachKey(state, key => {
          const propertyPath = path.concat(key)

          paths.push({ path: propertyPath, type: CARET_POSITION.KEY })
          _recurse(doc[key], state[key], propertyPath)
          paths.push({ path: propertyPath, type: CARET_POSITION.AFTER })
        })
      }
    }
  }

  _recurse(doc, state, [])

  return paths
}

/**
 * Find the previous visible path.
 * This can be the last child of the previous object or array, or the parent of a first entry.
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @return {Path | null}
 */
// TODO: write tests for getPreviousVisiblePath
export function getPreviousVisiblePath (doc, state, path) {
  const visiblePaths = getVisiblePaths(doc, state)
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
 * @param {JSON} doc
 * @param {JSON} state
 * @param {Path} path
 * @return {Path | null} path
 */
// TODO: write tests for getNextVisiblePath
export function getNextVisiblePath (doc, state, path) {
  const visiblePaths = getVisiblePaths(doc, state)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const index = visiblePathPointers.indexOf(compileJSONPointer(path))

  if (index !== -1 && index < visiblePaths.length - 1) {
    return visiblePaths[index + 1]
  }

  return null
}
