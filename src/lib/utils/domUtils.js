// TODO: write unit tests for getPlainText and setPlainText

import { SELECTION_TYPE } from '../logic/selection.js'

/**
 * Get the plain text from an HTML element
 * @param {Element} element  An HTML DOM element like a DIV
 * @return {string}
 */
export function getPlainText(element) {
  return unescapeHTML(traverseInnerText(element))
}

/**
 * Set plain text in an HTML element
 * @param {Element} element  An HTML DOM element like a DIV
 * @param {string} text
 */
export function setPlainText(element, text) {
  element.innerHTML = escapeHTML(text)
}
/**
 * escape a text, such that it can be displayed safely in an HTML element
 * @param {string} text
 * @return {string} escapedText
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return String(text)
  } else {
    const htmlEscaped = String(text)
      .replace(/&/g, '&amp;') // must be replaced first!
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/ {2}/g, ' &nbsp;') // replace double space with an nbsp and space
      .replace(/^ /, '&nbsp;') // space at start
      .replace(/ $/, '&nbsp;') // space at end

    const json = JSON.stringify(htmlEscaped)
    return json.substring(1, json.length - 1) // remove enclosing double quotes
  }
}

/**
 * unescape a string.
 * @param {string} escapedText
 * @return {string} text
 */
export function unescapeHTML(escapedText) {
  const json = '"' + escapeJSON(escapedText) + '"'
  const htmlEscaped = JSON.parse(json) // TODO: replace with a JSON.parse which does do linting and give an informative error

  return htmlEscaped.replace(/&nbsp;/g, ' ') // non breaking space character
}

/**
 * escape a text to make it a valid JSON string. The method will:
 *   - replace unescaped double quotes with '\"'
 *   - replace unescaped backslash with '\\'
 *   - replace returns with '\n'
 * @param {string} text
 * @return {string} escapedText
 * @private
 */
export function escapeJSON(text) {
  // TODO: replace with some smart regex (only when a new solution is faster!)
  let escaped = ''
  let i = 0
  while (i < text.length) {
    let c = text.charAt(i)
    if (c === '\n') {
      escaped += '\\n'
    } else if (c === '\\') {
      escaped += c
      i++

      c = text.charAt(i)
      if (c === '' || '"\\/bfnrtu'.indexOf(c) === -1) {
        escaped += '\\' // no valid escape character
      }
      escaped += c
    } else if (c === '"') {
      escaped += '\\"'
    } else {
      escaped += c
    }
    i++
  }

  return escaped
}

/**
 * Get the inner text of an HTML element (for example a div element)
 * @param {Element} element
 * @param {Object} [buffer]
 * @return {string} innerText
 */
export function traverseInnerText(element, buffer) {
  const first = buffer === undefined
  if (first) {
    buffer = {
      _text: '',
      flush: function () {
        const text = this._text
        this._text = ''
        return text
      },
      set: function (text) {
        this._text = text
      }
    }
  }

  // text node
  if (element.nodeValue) {
    // remove return characters and the whitespaces surrounding those return characters
    const trimmedValue = element.nodeValue.replace(regexReturnAndSurroundingWhitespace, '')
    if (trimmedValue !== '') {
      return buffer.flush() + trimmedValue
    } else {
      // ignore empty text
      return ''
    }
  }

  // divs or other HTML elements
  if (element.hasChildNodes()) {
    const childNodes = element.childNodes
    let innerText = ''

    for (let i = 0, iMax = childNodes.length; i < iMax; i++) {
      const child = childNodes[i]

      if (child.nodeName === 'DIV' || child.nodeName === 'P') {
        const prevChild = childNodes[i - 1]
        const prevName = prevChild ? prevChild.nodeName : undefined
        if (prevName && prevName !== 'DIV' && prevName !== 'P' && prevName !== 'BR') {
          if (innerText !== '') {
            innerText += '\n'
          }
          buffer.flush()
        }
        innerText += traverseInnerText(child, buffer)
        buffer.set('\n')
      } else if (child.nodeName === 'BR') {
        innerText += buffer.flush()
        buffer.set('\n')
      } else {
        innerText += traverseInnerText(child, buffer)
      }
    }

    return innerText
  }

  // br or unknown
  return ''
}

// regular expression matching one or multiple return characters with all their
// enclosing white spaces
export const regexReturnAndSurroundingWhitespace = /(\b|^)\s*\n\s*(\b|$)/g

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
  // TODO: can we replace isChildOf with Element.closest?
  let e = element

  while (e && !predicate(e)) {
    e = e.parentNode
  }

  return e && predicate(e)
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
  let e = element

  while (e && e.nodeName !== nodeName) {
    e = e.parentNode
  }

  return e
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
