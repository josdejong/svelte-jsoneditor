import { SELECTION_TYPE } from '../logic/selection.js'
import { map, minBy } from 'lodash-es'

/**
 * Create serialization functions to escape and stringify text,
 * and the other way around: to parse and unescape text.
 * @param {{
 *   escapeControlCharacters: boolean,
 *   escapeUnicodeCharacters: boolean
 * }} options
 * @return {ValueNormalization}
 */
export function createNormalizationFunctions({ escapeControlCharacters, escapeUnicodeCharacters }) {
  if (escapeControlCharacters) {
    if (escapeUnicodeCharacters) {
      return normalizeControlAndUnicode
    } else {
      return normalizeControl
    }
  } else {
    if (escapeUnicodeCharacters) {
      return normalizeUnicode
    } else {
      return normalizeNothing
    }
  }
}

const normalizeControlAndUnicode = {
  escapeValue: (value) => jsonEscapeUnicode(jsonEscapeControl(String(value))),
  unescapeValue: (value) => jsonUnescapeControl(jsonUnescapeUnicode(value))
}

const normalizeControl = {
  escapeValue: (value) => jsonEscapeControl(String(value)),
  unescapeValue: (value) => jsonUnescapeControl(value)
}

const normalizeUnicode = {
  escapeValue: (value) => jsonEscapeUnicode(String(value)),
  unescapeValue: (value) => jsonUnescapeUnicode(value)
}

const normalizeNothing = {
  escapeValue: (value) => String(value),
  unescapeValue: (value) => value
}

/**
 * Source:  https://stackoverflow.com/questions/12271547/shouldnt-json-stringify-escape-unicode-characters
 * @param {string} value
 * @returns {string}
 */
export function jsonEscapeUnicode(value) {
  return value.replace(/[^\x20-\x7F]/g, (x) => {
    if (x === '\b' || x === '\f' || x === '\n' || x === '\r' || x === '\t') {
      return x
    }

    return '\\u' + ('000' + x.codePointAt(0).toString(16)).slice(-4)
  })
}

/**
 * @param {string} value
 */
export function jsonUnescapeUnicode(value) {
  return value.replace(/\\u[a-fA-F0-9]{4}/g, (x) => {
    try {
      return JSON.parse('"' + x + '"')
    } catch (err) {
      return x
    }
  })
}

const controlCharacters = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
}

const escapedControlCharacters = {
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t'
}

/**
 * @param {string} value
 */
export function jsonEscapeControl(value) {
  return value.replace(/[\b\f\n\r\t]/g, (x) => {
    return controlCharacters[x] || x
  })
}

/**
 * @param {string} value
 */
export function jsonUnescapeControl(value) {
  return value.replace(/\\[bfnrt]/g, (x) => {
    return escapedControlCharacters[x] || x
  })
}

/**
 * @param {any} value
 * @return {string} value
 */
export function addNewLineSuffix(value) {
  if (typeof value !== 'string') {
    return String(value)
  }

  if (value.endsWith('\n')) {
    // DOM innerText strips the last \n, therefore we add an extra \n here
    return value + '\n'
  }

  return value
}

/**
 * Remove a newline suffix from text returned by element.innerText, it adds
 * one return too much.
 * @param {string} text
 * @returns {string}
 */
export function removeNewLineSuffix(text) {
  return text.replace(/\n$/, '')
}

// regular expression matching one or multiple return characters with all their
// enclosing white spaces
export function removeReturnsAndSurroundingWhitespace(text) {
  return text.replace(/(\b|^)\s*(\b|$)/g, (match) => {
    return /\n/.exec(match) ? '' : match
  })
}

export function isChildOfNodeName(element, nodeName) {
  return isChildOf(element, (e) => e.nodeName.toUpperCase() === nodeName.toUpperCase())
}

export function isChildOfAttribute(element, name, value) {
  return isChildOf(element, (e) => hasAttribute(e, name, value))
}

// test whether a DOM element is a content editable div
export function isContentEditableDiv(element) {
  return element.nodeName === 'DIV' && element.contentEditable === 'true'
}

// test whether a DOM element is an "input" with type "text"
export function isTextInput(element) {
  return element.nodeName === 'INPUT' && element.type && element.type.toLowerCase() === 'text'
}

function hasAttribute(element, name, value) {
  return typeof element.getAttribute === 'function' && element.getAttribute(name) === value
}

/**
 * Test if the element or one of it's parents has a certain predicate
 * Can be use for example to check whether the element or it's parent has
 * a specific attribute or nodeName.
 * @param {HTMLElement} element
 * @param {function (element: HTMLElement) : boolean} predicate
 * @returns {*}
 */
export function isChildOf(element, predicate) {
  return !!findParent(element, predicate)
}

/**
 * Test if the element or one of its parents has a certain predicate
 * Can be use for example to check whether the element or it's parent has
 * a specific attribute or nodeName.
 * @param {HTMLElement} element
 * @param {function (element: HTMLElement) : boolean} predicate
 * @returns {HTMLElement | undefined}
 */
export function findParent(element, predicate) {
  let e = element

  while (e && !predicate(e)) {
    e = e.parentNode
  }

  return e || undefined
}

/**
 * Set the cursor to the end of a content editable div
 * Source: https://stackoverflow.com/questions/13513329/set-cursor-to-the-end-of-contenteditable-div
 * @param {HTMLElement} element
 */
export function setCursorToEnd(element) {
  if (element.firstChild == null) {
    element.focus()
    return
  }

  const range = document.createRange()
  const selection = window.getSelection()
  range.setStart(element, 1)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Gets a DOM element's Window.  This is normally just the global `window`
 * variable, but if we opened a child window, it may be different.
 * @param {HTMLElement} element
 * @return {Window}
 */
export function getWindow(element) {
  return element && element.ownerDocument && element.ownerDocument.defaultView
}

/**
 * @param {HTMLElement} element
 * @return {boolean}
 */
export function activeElementIsChildOf(element) {
  const window = getWindow(element)
  return isChildOf(window.document.activeElement, (e) => e === element)
}

/**
 * Traverse over the parents of the element until a node is found with the
 * searched for node name. If the element itself contains the nodeName, the
 * element itself will be returned
 * @param {HTMLElement} element
 * @param {string} nodeName
 * @return {HTMLElement | undefined}
 */
export function findParentWithNodeName(element, nodeName) {
  return findParent(element, (e) => e.nodeName === nodeName)
}

/**
 * @param {HTMLElement} target
 * @returns {string | null}
 */
export function getSelectionTypeFromTarget(target) {
  if (isChildOfAttribute(target, 'data-type', 'selectable-key')) {
    return SELECTION_TYPE.KEY
  }

  if (isChildOfAttribute(target, 'data-type', 'selectable-value')) {
    return SELECTION_TYPE.VALUE
  }

  if (isChildOfAttribute(target, 'data-type', 'insert-selection-area-inside')) {
    return SELECTION_TYPE.INSIDE
  }

  if (isChildOfAttribute(target, 'data-type', 'insert-selection-area-after')) {
    return SELECTION_TYPE.AFTER
  }

  return SELECTION_TYPE.MULTI
}

/**
 * Encode a path into a string that can be used as attribute in HTML
 * @param {Path} path
 * @returns {string}
 */
export function encodeDataPath(path) {
  return encodeURIComponent(JSON.stringify(path))
}

/**
 * Decode a path that was stringified for use as an HTML attribute
 * @param {string} pathStr
 * @returns {Path}
 */
export function decodeDataPath(pathStr) {
  return JSON.parse(decodeURIComponent(pathStr))
}

/**
 * Find the data path of the given element. Traverses the parent nodes until find
 * @param {HTMLElement} target
 * @returns {Path | null}
 */
export function getDataPathFromTarget(target) {
  const parent = findParent(target, (element) => {
    return element.hasAttribute('data-path')
  })

  return parent ? decodeDataPath(parent.getAttribute('data-path')) : null
}

/**
 * Find the nearest element in a given context menu with buttons or inputs
 */
// TODO: unit test
export function findNearestElement<T extends Element>({
  allElements,
  currentElement,
  direction,
  hasPrio = () => true,
  margin = 10
}: {
  allElements: T[]
  currentElement: T
  direction: 'Up' | 'Down' | 'Left' | 'Right'
  margin?: number
  hasPrio?: (element: T) => boolean
}): T | undefined {
  const all = map(allElements.filter(isVisible), calculateCenter)
  const current = calculateCenter(currentElement)

  interface CenterLocation {
    x: number
    y: number
    rect: DOMRect
    element: T
  }

  function isVisible(element: T): boolean {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }

  function calculateCenter(element: T): CenterLocation {
    const rect = element.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      rect,
      element
    }
  }

  const isOnSameRow = (a: CenterLocation, b: CenterLocation) => Math.abs(a.y - b.y) < margin
  const isLeft = (a: CenterLocation, b: CenterLocation) => a.rect.left + margin < b.rect.left
  const isRight = (a: CenterLocation, b: CenterLocation) => a.rect.right > b.rect.right + margin
  const isAbove = (a: CenterLocation, b: CenterLocation) => a.y + margin < b.y
  const isBelow = (a: CenterLocation, b: CenterLocation) => a.y > b.y + margin

  function distance(a: CenterLocation, b: CenterLocation, weightY = 1): number {
    const diffX = a.x - b.x
    const diffY = (a.y - b.y) * weightY
    return Math.sqrt(diffX * diffX + diffY * diffY)
  }
  const distanceToCurrent = (candidate) => distance(candidate, current)
  const distanceToCurrentWeighted = (candidate) => distance(candidate, current, 10)

  if (direction === 'Left' || direction === 'Right') {
    // First we find the first button left from the current button on the same row
    // if not found, search the closest button left/right from current button
    const candidatesLeft =
      direction === 'Left'
        ? all.filter((button) => isLeft(button, current))
        : all.filter((button) => isRight(button, current))
    const candidatesLeftOnRow = candidatesLeft.filter((button) => isOnSameRow(button, current))
    const nearest =
      minBy(candidatesLeftOnRow, distanceToCurrent) ||
      minBy(candidatesLeft, distanceToCurrentWeighted)

    return nearest?.element
  }

  if (direction === 'Up' || direction === 'Down') {
    // first we only search through the prio buttons
    // if there were no matching prio buttons, search all matching buttons
    const candidates =
      direction === 'Up'
        ? all.filter((button) => isAbove(button, current))
        : all.filter((button) => isBelow(button, current))
    const prioCandidates = candidates.filter((button) => hasPrio(button.element))
    const nearest = minBy(prioCandidates, distanceToCurrent) || minBy(candidates, distanceToCurrent)

    return nearest?.element
  }

  return undefined
}
