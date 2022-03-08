import { compileJSONPointer } from 'immutable-json-patch'
import jsonSourceMap from 'json-source-map'
import jsonrepair from 'jsonrepair'
import { isObject } from './typeUtils.js'

/**
 * Parse the JSON. if this fails, try to repair and parse.
 * Throws an exception when the JSON is invalid and could not be parsed.
 * @param {string} jsonText
 * @returns {JSON}
 */
export function parseAndRepair(jsonText) {
  try {
    return JSON.parse(jsonText)
  } catch (err) {
    // this can also throw
    return JSON.parse(jsonrepair(jsonText))
  }
}

/**
 * Parse the JSON and if needed repair it.
 * When not valid, undefined is returned.
 * @param {string} partialJson
 * @returns {undefined|JSON}
 */
export function parseAndRepairOrUndefined(partialJson) {
  try {
    return parseAndRepair(partialJson)
  } catch (err) {
    return undefined
  }
}

/**
 * @param {string} partialJson
 * @param {function} [parse=JSON.parse]
 * @return {JSON}
 */
// TODO: deduplicate the logic in repairPartialJson and parseAndRepairPartialJson ?
export function parsePartialJson(partialJson, parse = JSON.parse) {
  // for now: dumb brute force approach: simply try out a few things...

  // remove trailing comma
  partialJson = partialJson.replace(END_WITH_COMMA_AND_OPTIONAL_WHITESPACES_REGEX, '')

  try {
    return parse(partialJson)
  } catch (err) {
    // we ignore the error on purpose
  }

  try {
    return parse('[' + partialJson + ']')
  } catch (err) {
    // we ignore the error on purpose
  }

  try {
    return parse('{' + partialJson + '}')
  } catch (err) {
    // we ignore the error on purpose
  }

  throw new Error('Failed to parse partial JSON')
}

/**
 * Repair partial JSON
 * @param {string} partialJson
 * @returns {string}
 */
export function repairPartialJson(partialJson) {
  // for now: dumb brute force approach: simply try out a few things...

  // remove trailing comma
  partialJson = partialJson.replace(END_WITH_COMMA_AND_OPTIONAL_WHITESPACES_REGEX, '')

  try {
    return jsonrepair(partialJson)
  } catch (err) {
    // we ignore the error on purpose
  }

  try {
    const repaired = jsonrepair('[' + partialJson + ']')
    return repaired.substring(1, repaired.length - 1) // remove the outer [...] again
  } catch (err) {
    // we ignore the error on purpose
  }

  try {
    const repaired = jsonrepair('{' + partialJson + '}')
    return repaired.substring(1, repaired.length - 1) // remove the outer {...} again
  } catch (err) {
    // we ignore the error on purpose
  }

  throw new Error('Failed to repair partial JSON')
}

// test whether a string ends with a comma, followed by zero or more white space characters
const END_WITH_COMMA_AND_OPTIONAL_WHITESPACES_REGEX = /,\s*$/

/**
 * Normalize a parse error message like
 *     "Unexpected token i in JSON at position 4"
 * or
 *     "JSON.parse: expected property name or '}' at line 2 column 3 of the JSON data"
 * and return the line and column numbers in an object
 *
 * Note that the returned line and column number in the object are zero-based,
 * and in the message are one based (human readable)
 *
 * @param {string} jsonText
 * @param {string} parseErrorMessage
 * @return {{
 *   position: number | null,
 *   line: number | null,
 *   column: number | null,
 *   message: string
 * }}
 */
export function normalizeJsonParseError(jsonText, parseErrorMessage) {
  const positionMatch = POSITION_REGEX.exec(parseErrorMessage)

  if (positionMatch) {
    // a message from Chrome, like "Unexpected token i in JSON at line 2 column 3"
    const position = parseInt(positionMatch[2], 10)

    const line = countCharacterOccurrences(jsonText, '\n', 0, position)
    const lastIndex = jsonText.lastIndexOf('\n', position)
    const column = position - lastIndex - 1

    return {
      position,
      line,
      column,
      message: parseErrorMessage.replace(POSITION_REGEX, () => {
        return `line ${line + 1} column ${column + 1}`
      })
    }
  } else {
    // a message from Firefox, like "JSON.parse: expected property name or '}' at line 2 column 3 of the JSON data"
    const lineMatch = LINE_REGEX.exec(parseErrorMessage)
    const lineOneBased = lineMatch ? parseInt(lineMatch[1], 10) : null
    const line = lineOneBased !== null ? lineOneBased - 1 : null

    const columnMatch = COLUMN_REGEX.exec(parseErrorMessage)
    const columnOneBased = columnMatch ? parseInt(columnMatch[1], 10) : null
    const column = columnOneBased !== null ? columnOneBased - 1 : null

    const position =
      line !== null && column !== null ? calculatePosition(jsonText, line, column) : null

    // line and column are one based in the message
    return {
      position,
      line,
      column,
      message: parseErrorMessage.replace(/^JSON.parse: /, '').replace(/ of the JSON data$/, '')
    }
  }
}

/**
 * Calculate the position in the text based on a line and column number
 * @param {string} text
 * @param {number} line     Zero-based line number
 * @param {number} column   Zero-based column number
 * @returns {number | null}
 */
export function calculatePosition(text, line, column) {
  let index = text.indexOf('\n')
  let i = 1

  while (i < line && index !== -1) {
    index = text.indexOf('\n', index + 1)
    i++
  }

  return index !== -1
    ? index + column + 1 // +1 for the return character itself
    : null
}

export function countCharacterOccurrences(text, character, start = 0, end = text.length) {
  let count = 0

  for (let i = start; i < end; i++) {
    if (text.charAt(i) === character) {
      count++
    }
  }

  return count
}

/**
 * Find the text location of a JSON path
 * @param {string} text
 * @param {Path} path
 * @return {{path: Path, line: number, column: number, from: number, to: number} | null}
 */
// TODO: write unit tests
export function findTextLocation(text, path) {
  try {
    const jsmap = jsonSourceMap.parse(text)

    const pointerName = compileJSONPointer(path)
    const pointer = jsmap.pointers[pointerName]
    if (pointer) {
      return {
        path: path,
        line: pointer.key ? pointer.key.line : pointer.value ? pointer.value.line : 0,
        column: pointer.key ? pointer.key.column : pointer.value ? pointer.value.column : 0,
        from: pointer.key ? pointer.key.pos : pointer.value ? pointer.value.pos : 0,
        to: pointer.keyEnd ? pointer.keyEnd.pos : pointer.valueEnd ? pointer.valueEnd.pos : 0
      }
    }
  } catch (err) {
    console.error(err)
  }

  return null
}

/**
 * @param {any} content
 * @return {string | null} Returns a string with validation error message when
 *                         there is an issue, or null otherwise
 */
export function validateContentType(content) {
  if (!isObject(content)) {
    return 'Content must be an object'
  }

  if (content.json !== undefined) {
    if (content.text !== undefined) {
      return 'Content must contain either a property "json" or a property "text" but not both'
    } else {
      return null
    }
  } else {
    if (content.text === undefined) {
      return 'Content must contain either a property "json" or a property "text"'
    } else if (typeof content.text !== 'string') {
      return 'Content "text" property must be string'
    } else {
      return null
    }
  }
}

const POSITION_REGEX = /(position|char) (\d+)/
const LINE_REGEX = /line (\d+)/
const COLUMN_REGEX = /column (\d+)/
