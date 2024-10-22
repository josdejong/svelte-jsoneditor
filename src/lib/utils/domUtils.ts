import type { ValueNormalization } from '$lib/types.js'
import { SelectionType } from '$lib/types.js'
import type { JSONPath } from 'immutable-json-patch'
import { compileJSONPointer, parseJSONPointer } from 'immutable-json-patch'
import { map, minBy } from 'lodash-es'

/**
 * Create serialization functions to escape and stringify text,
 * and the other way around: to parse and unescape text.
 */
export function createNormalizationFunctions({
  escapeControlCharacters,
  escapeUnicodeCharacters
}: {
  escapeControlCharacters: boolean
  escapeUnicodeCharacters: boolean
}): ValueNormalization {
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
  escapeValue: (value: unknown) => jsonEscapeUnicode(jsonEscapeControl(String(value))),
  unescapeValue: (value: string) => jsonUnescapeControl(jsonUnescapeUnicode(value))
}

const normalizeControl = {
  escapeValue: (value: unknown) => jsonEscapeControl(String(value)),
  unescapeValue: (value: string) => jsonUnescapeControl(value)
}

const normalizeUnicode = {
  escapeValue: (value: unknown) => jsonEscapeUnicode(String(value)),
  unescapeValue: (value: string) => jsonUnescapeUnicode(value)
}

const normalizeNothing = {
  escapeValue: (value: unknown) => String(value),
  unescapeValue: (value: string) => value
}

/**
 * Source:  https://stackoverflow.com/questions/12271547/shouldnt-json-stringify-escape-unicode-characters
 */
export function jsonEscapeUnicode(value: string): string {
  return value.replace(/[^\x20-\x7F]/g, (x) => {
    if (x === '\b' || x === '\f' || x === '\n' || x === '\r' || x === '\t') {
      return x
    }

    return '\\u' + ('000' + x.codePointAt(0)?.toString(16)).slice(-4)
  })
}

export function jsonUnescapeUnicode(value: string): string {
  return value.replace(/\\u[a-fA-F0-9]{4}/g, (x) => {
    try {
      const unescaped: string = JSON.parse('"' + x + '"')
      // the resolved character can be a control character like " or \n,
      // that would result in invalid JSON, so we need to keep that escaped
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return controlCharacters[unescaped] || unescaped
    } catch {
      return x
    }
  })
}

const controlCharacters = {
  '"': '\\"',
  '\\': '\\\\',
  // escaped forward slash '\/' is the same as '/', we can't escape/unescape it
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
  // unicode is handled separately
}

const escapedControlCharacters = {
  '\\"': '"',
  '\\\\': '\\',
  // escaped forward slash '\/' is the same as '/', we can't escape/unescape it
  '\\/': '/',
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t'
  // unicode is handled separately
}

export function jsonEscapeControl(value: string): string {
  return value.replace(/["\b\f\n\r\t\\]/g, (x) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return controlCharacters[x] || x
  })
}

export function jsonUnescapeControl(value: string): string {
  return value.replace(/\\["bfnrt\\]/g, (x) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return escapedControlCharacters[x] || x
  })
}

export function addNewLineSuffix(value: unknown): string {
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
 */
export function removeNewLineSuffix(text: string): string {
  return text.replace(/\n$/, '')
}

// regular expression matching one or multiple return characters with all their
// enclosing white spaces
export function removeReturnsAndSurroundingWhitespace(text: string): string {
  return text.replace(/(\b|^)\s*(\b|$)/g, (match) => {
    return /\n/.exec(match) ? '' : match
  })
}

export function isChildOfNodeName(element: Element, nodeName: string): boolean {
  return isChildOf(element, (e) => e.nodeName.toUpperCase() === nodeName.toUpperCase())
}

export function isChildOfAttribute(element: Element, name: string, value: string): boolean {
  return isChildOf(element, (e) => hasAttribute(e, name, value))
}

// test whether a DOM element is a content editable div
export function isContentEditableDiv(element: HTMLElement): boolean {
  return element.nodeName === 'DIV' && element.contentEditable === 'true'
}

// test whether a DOM element is an "input" with type "text"
export function isTextInput(element: HTMLInputElement): boolean {
  return (
    element.nodeName === 'INPUT' &&
    element.type !== undefined &&
    element.type.toLowerCase() === 'text'
  )
}

function hasAttribute(element: Element, name: string, value: string): boolean {
  return typeof element.getAttribute === 'function' && element.getAttribute(name) === value
}

/**
 * Test if the element or one of its parents has a certain predicate
 * Can be use for example to check whether the element or it's parent has
 * a specific attribute or nodeName.
 */
export function isChildOf(element: Element, predicate: (element: Element) => boolean): boolean {
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
export function findParent(
  element: Element,
  predicate: (element: Element) => boolean
): Element | undefined {
  let e: Element | undefined = element

  while (e && !predicate(e)) {
    e = e.parentNode as Element
  }

  return e
}

/**
 * Set the cursor to the end of a content editable div
 * Source: https://stackoverflow.com/questions/13513329/set-cursor-to-the-end-of-contenteditable-div
 * @param {HTMLElement} element
 */
export function setCursorToEnd(element: HTMLElement) {
  if (element.firstChild == null) {
    element.focus()
    return
  }

  const range = document.createRange()
  const selection = window.getSelection()
  range.setStart(element, 1)
  range.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * Gets a DOM element's Window.  This is normally just the global `window`
 * variable, but if we opened a child window, it may be different.
 */
export function getWindow(element: Element): Window | undefined {
  return element?.ownerDocument?.defaultView ?? undefined
}

export function activeElementIsChildOf(element: Element) {
  const window = getWindow(element)
  const activeElement = window?.document.activeElement
  return activeElement ? isChildOf(activeElement, (e) => e === element) : false
}

/**
 * Traverse over the parents of the element until a node is found with the
 * searched for node name. If the element itself contains the nodeName, the
 * element itself will be returned
 */
export function findParentWithNodeName(element: Element, nodeName: string): Element | undefined {
  return findParent(element, (e) => e.nodeName === nodeName)
}

export function getSelectionTypeFromTarget(target: Element): SelectionType {
  if (isChildOfAttribute(target, 'data-type', 'selectable-key')) {
    return SelectionType.key
  }

  if (isChildOfAttribute(target, 'data-type', 'selectable-value')) {
    return SelectionType.value
  }

  if (isChildOfAttribute(target, 'data-type', 'insert-selection-area-inside')) {
    return SelectionType.inside
  }

  if (isChildOfAttribute(target, 'data-type', 'insert-selection-area-after')) {
    return SelectionType.after
  }

  return SelectionType.multi
}

/**
 * Encode a path into a string that can be used as attribute in HTML
 */
export function encodeDataPath(path: JSONPath): string {
  return encodeURIComponent(compileJSONPointer(path))
}

/**
 * Decode a path that was stringified for use as an HTML attribute
 */
export function decodeDataPath(pathStr: string): JSONPath {
  return parseJSONPointer(decodeURIComponent(pathStr))
}

/**
 * Find the data path of the given element. Traverses the parent nodes until find
 */
export function getDataPathFromTarget(target: Element): JSONPath | undefined {
  const parent = findParent(target, (element) => {
    return element?.hasAttribute ? element.hasAttribute('data-path') : false
  })

  const dataPath = parent?.getAttribute('data-path') ?? undefined
  return dataPath ? decodeDataPath(dataPath) : undefined
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
  const distanceToCurrent = (candidate: CenterLocation) => distance(candidate, current)
  const distanceToCurrentWeighted = (candidate: CenterLocation) => distance(candidate, current, 10)

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
