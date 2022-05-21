import type { JSONPath } from 'immutable-json-patch'
import { compileJSONPointer } from 'immutable-json-patch'
import jsonSourceMap from 'json-source-map'
import jsonrepair from 'jsonrepair'
import { isObject, isObjectOrArray, valueType } from './typeUtils.js'
import { arrayToObject, objectToArray } from './arrayUtils.js'
import type {
  Content,
  NormalizedParseError,
  Path,
  TextLocation,
  JSONData,
  TextContent
} from '../types'

/**
 * Parse the JSON. if this fails, try to repair and parse.
 * Throws an exception when the JSON is invalid and could not be parsed.
 */
export function parseAndRepair(jsonText: string): JSONData {
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
 */
export function parseAndRepairOrUndefined(partialJson: string): JSONData | undefined {
  try {
    return parseAndRepair(partialJson)
  } catch (err) {
    return undefined
  }
}

// TODO: deduplicate the logic in repairPartialJson and parseAndRepairPartialJson ?
export function parsePartialJson(partialJson: string, parse = JSON.parse): JSONData {
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
 */
export function repairPartialJson(partialJson: string): string {
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
 */
export function normalizeJsonParseError(
  jsonText: string,
  parseErrorMessage: string
): NormalizedParseError {
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
 * @param text
 * @param line     Zero-based line number
 * @param column   Zero-based column number
 */
export function calculatePosition(text: string, line: number, column: number): number | null {
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

export function countCharacterOccurrences(
  text: string,
  character: string,
  start = 0,
  end = text.length
) {
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
 */
// TODO: write unit tests
export function findTextLocation(text: string, path: Path): TextLocation | null {
  try {
    const jsmap = jsonSourceMap.parse(text)

    const pointerName = compileJSONPointer(path as JSONPath)
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
 * Convert a JSON object, array, or value to another type
 * If it cannot be converted, an error is thrown
 */
export function convertValue(value: JSONData, type: 'value' | 'object' | 'array'): JSONData {
  // FIXME: improve the TypeScript here, there are a couple of conversions
  if (type === 'array') {
    if (Array.isArray(value)) {
      // nothing to do
      return value
    }

    if (isObject(value)) {
      return objectToArray(value)
    }

    if (typeof value === 'string') {
      const parsedValue = JSON.parse(value)

      if (Array.isArray(parsedValue)) {
        return parsedValue
      }

      if (isObject(parsedValue)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return objectToArray(parsedValue)
      }
    }
  }

  if (type === 'object') {
    if (Array.isArray(value)) {
      return arrayToObject(value)
    }

    if (isObject(value)) {
      // nothing to do
      return value
    }

    if (typeof value === 'string') {
      const parsedValue = JSON.parse(value)

      if (isObject(parsedValue)) {
        return parsedValue as JSONData
      }

      if (Array.isArray(parsedValue)) {
        return arrayToObject(parsedValue)
      }
    }
  }

  if (type === 'value') {
    if (isObjectOrArray(value)) {
      return JSON.stringify(value)
    }

    // nothing to do
    return value
  }

  throw new Error(`Cannot convert ${valueType(value)} to ${type}`)
}

/**
 * Check whether provided value is valid a content type for JSONEditor
 * Returns a string with validation error message when there is an issue,
 * or null otherwise
 */
export function validateContentType(content: unknown): string | null {
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

/**
 * Check whether content contains text (and not JSON)
 */
export function isTextContent(content: Content): content is TextContent {
  return typeof (content as Record<string, unknown>).text === 'string'
}

/**
 * Returns true when the (estimated) size of the contents exceeds the
 * provided maxSize.
 * @param content
 * @param maxSize  Maximum content size in bytes
 */
export function isLargeContent(content: Content, maxSize: number): boolean {
  return estimateSerializedSize(content, maxSize) > maxSize
}

/**
 * A rough, fast estimation on whether a document is larger than given size
 * when serialized.
 *
 * maxSize is an optional max size in bytes. When reached, size estimation will
 * be cancelled. This is useful when you're only interested in knowing whether
 * the size exceeds a certain maximum size.
 */
export function estimateSerializedSize(content: Content, maxSize = Infinity): number {
  if (isTextContent(content)) {
    return content.text.length
  }

  const json = content.json

  let estimatedSize = 0

  function recurse(json) {
    if (Array.isArray(json)) {
      // open and close bracket, commas between items
      estimatedSize += 2 + (json.length - 1)

      if (estimatedSize > maxSize) {
        return estimatedSize
      }

      for (let i = 0; i < json.length; i++) {
        const item = json[i]

        recurse(item)

        if (estimatedSize > maxSize) {
          return estimatedSize
        }
      }
    } else if (isObject(json)) {
      const keys = Object.keys(json)

      // open and close brackets, separators between all keys and values, comma's between key/value pairs
      estimatedSize += 2 + keys.length + (keys.length - 1)

      for (let k = 0; k < keys.length; k++) {
        const key = keys[k]
        const value = json[key]

        // key length and double quotes around it
        estimatedSize += key.length + 2

        recurse(value)
      }
    } else if (typeof json === 'string') {
      estimatedSize += json.length + 2 // string length plus two for the double quote characters
    } else {
      // true, false, null, number
      estimatedSize += String(json).length
    }
  }

  recurse(json)

  return estimatedSize
}

const POSITION_REGEX = /(position|char) (\d+)/
const LINE_REGEX = /line (\d+)/
const COLUMN_REGEX = /column (\d+)/
