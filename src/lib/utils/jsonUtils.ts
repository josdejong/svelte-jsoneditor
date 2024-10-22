import type { JSONPath } from 'immutable-json-patch'
import { compileJSONPointer } from 'immutable-json-patch'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jsonSourceMap from 'json-source-map'
import { jsonrepair } from 'jsonrepair'
import { isObject, isObjectOrArray, valueType } from './typeUtils.js'
import { arrayToObject, objectToArray } from './arrayUtils.js'
import type {
  Content,
  JSONContent,
  JSONParser,
  ParseError,
  TextContent,
  TextLocation
} from '../types'
import { int } from './numberUtils.js'

/**
 * Parse the JSON. if this fails, try to repair and parse.
 * Throws an exception when the JSON is invalid and could not be parsed.
 */
export function parseAndRepair(jsonText: string, parser: JSONParser): unknown {
  try {
    return parser.parse(jsonText)
  } catch {
    // this can also throw
    return parser.parse(jsonrepair(jsonText))
  }
}

/**
 * Parse the JSON and if needed repair it.
 * When not valid, undefined is returned.
 */
export function parseAndRepairOrUndefined(
  partialJson: string,
  parser: JSONParser
): unknown | undefined {
  try {
    return parseAndRepair(partialJson, parser)
  } catch {
    return undefined
  }
}

// TODO: deduplicate the logic in repairPartialJson and parseAndRepairPartialJson ?
export function parsePartialJson(partialJson: string, parse: (text: string) => unknown): unknown {
  // for now: dumb brute force approach: simply try out a few things...

  // remove trailing comma
  partialJson = partialJson.replace(END_WITH_COMMA_AND_OPTIONAL_WHITESPACES_REGEX, '')

  try {
    return parse(partialJson)
  } catch {
    // we ignore the error on purpose
  }

  try {
    return parse('{' + partialJson + '}')
  } catch {
    // we ignore the error on purpose
  }

  try {
    return parse('[' + partialJson + ']')
  } catch {
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
  } catch {
    // we ignore the error on purpose
  }

  try {
    const repaired = jsonrepair('[' + partialJson + ']')
    return repaired.substring(1, repaired.length - 1) // remove the outer [...] again
  } catch {
    // we ignore the error on purpose
  }

  try {
    const repaired = jsonrepair('{' + partialJson + '}')
    return repaired.substring(1, repaired.length - 1) // remove the outer {...} again
  } catch {
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
 * and in the message are one based (human-readable)
 */
export function normalizeJsonParseError(jsonText: string, parseErrorMessage: string): ParseError {
  const positionMatch = POSITION_REGEX.exec(parseErrorMessage)

  if (positionMatch) {
    // a message from Chrome, like "Unexpected token i in JSON at line 2 column 3"
    const position = int(positionMatch[2])

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
    const lineOneBased = lineMatch ? int(lineMatch[1]) : undefined
    const line = lineOneBased !== undefined ? lineOneBased - 1 : undefined

    const columnMatch = COLUMN_REGEX.exec(parseErrorMessage)
    const columnOneBased = columnMatch ? int(columnMatch[1]) : undefined
    const column = columnOneBased !== undefined ? columnOneBased - 1 : undefined

    const position =
      line !== undefined && column !== undefined
        ? calculatePosition(jsonText, line, column)
        : undefined

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
export function calculatePosition(text: string, line: number, column: number): number | undefined {
  let index = text.indexOf('\n')
  let i = 1

  while (i < line && index !== -1) {
    index = text.indexOf('\n', index + 1)
    i++
  }

  return index !== -1
    ? index + column + 1 // +1 for the return character itself
    : undefined
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
export function findTextLocation(text: string, path: JSONPath): TextLocation {
  try {
    const jsmap = jsonSourceMap.parse(text)

    const pointerName = compileJSONPointer(path)
    const pointer = jsmap.pointers[pointerName]
    if (pointer) {
      return {
        path,
        line: pointer.key ? pointer.key.line : pointer.value ? pointer.value.line : 0,
        column: pointer.key ? pointer.key.column : pointer.value ? pointer.value.column : 0,
        from: pointer.key ? pointer.key.pos : pointer.value ? pointer.value.pos : 0,
        to: pointer.keyEnd ? pointer.keyEnd.pos : pointer.valueEnd ? pointer.valueEnd.pos : 0
      }
    }
  } catch (err) {
    console.error(err)
  }

  return {
    path,
    line: 0,
    column: 0,
    from: 0,
    to: 0
  }
}

/**
 * Convert a JSON object, array, or value to another type
 * If it cannot be converted, an error is thrown
 */
export function convertValue(
  value: unknown,
  type: 'value' | 'object' | 'array',
  parser: JSONParser
): unknown {
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
      try {
        const parsedValue = parser.parse(value)

        if (Array.isArray(parsedValue)) {
          return parsedValue
        }

        if (isObject(parsedValue)) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return objectToArray(parsedValue)
        }
      } catch {
        //we could not parse the string, so we return the string as the first key of the array
        return [value]
      }
    }

    //all other cases, we return the value as the first key of the array, same as the parsing error under the string case
    return [value]
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
      try {
        const parsedValue = parser.parse(value)

        if (isObject(parsedValue)) {
          return parsedValue
        }

        if (Array.isArray(parsedValue)) {
          return arrayToObject(parsedValue)
        }
      } catch {
        //we could not parse the string, so we return the string as the first value of the object with key 'value'
        return { value: value }
      }
    }

    //all other cases, we return the value keyed under "value", same as the parsing error under the string case
    return { value: value }
  }

  if (type === 'value') {
    if (isObjectOrArray(value)) {
      return parser.stringify(value)
    }

    // nothing to do
    return value
  }

  throw new Error(`Cannot convert ${valueType(value, parser)} to ${type}`)
}

/**
 * Check whether provided value is valid a content type for JSONEditor
 * Returns a string with validation error message when there is an issue,
 * or null otherwise
 */
export function validateContentType(content: unknown): string | undefined {
  if (!isObject(content)) {
    return 'Content must be an object'
  }

  if (content.json !== undefined) {
    if (content.text !== undefined) {
      return 'Content must contain either a property "json" or a property "text" but not both'
    } else {
      return undefined
    }
  } else {
    if (content.text === undefined) {
      return 'Content must contain either a property "json" or a property "text"'
    } else if (typeof content.text !== 'string') {
      return (
        'Content "text" property must be a string containing a JSON document. ' +
        'Did you mean to use the "json" property instead?'
      )
    } else {
      return undefined
    }
  }
}

/**
 * Check whether a value is Content (TextContent or JSONContent)
 */
export function isContent(content: unknown): content is Content {
  return (
    isObject(content) && (typeof content.json !== 'undefined' || typeof content.text === 'string')
  )
}

/**
 * Check whether content contains text (and not JSON)
 */
export function isTextContent(content: unknown): content is TextContent {
  return isObject(content) && typeof content.text === 'string'
}

/**
 * Check whether content contains json
 */
export function isJSONContent(content: unknown): content is JSONContent {
  return isObject(content) && typeof content.json !== 'undefined'
}

/**
 * Convert Content into TextContent if it is JSONContent, else leave it as is
 */
export function toTextContent(
  content: Content,
  indentation: number | string | undefined = undefined,
  parser: JSONParser = JSON
): TextContent {
  return isTextContent(content)
    ? content
    : { text: parser.stringify(content.json, null, indentation) as string }
}

/**
 * Convert Content into TextContent if it is JSONContent, else leave it as is
 * @throws {SyntaxError} Will throw a parse error when the text contents does not contain valid JSON
 */
export function toJSONContent(content: Content, parser: JSONParser = JSON): JSONContent {
  return isJSONContent(content) ? content : { json: parser.parse(content.text) }
}

/**
 * Get the contents as Text. If the contents is JSON, the JSON will be parsed.
 */
export function getText(content: Content, indentation: number | string, parser: JSONParser) {
  return toTextContent(content, indentation, parser).text
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

  function recurse(json: unknown) {
    if (Array.isArray(json)) {
      // open and close bracket, commas between items
      estimatedSize += 2 + (json.length - 1)

      if (estimatedSize > maxSize) {
        return
      }

      for (let i = 0; i < json.length; i++) {
        const item = json[i]

        recurse(item)

        if (estimatedSize > maxSize) {
          return
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

/**
 * Check whether the actual functions of parse and stringify are strictly equal.
 * The object holding the functions may be a differing instance.
 */
export function isEqualParser(a: JSONParser, b: JSONParser): boolean {
  return a.parse === b.parse && a.stringify === b.stringify
}

/**
 * Apply a fast and cheap heuristic to determine whether the content needs formatting (i.e. is compact).
 */
export function needsFormatting(jsonText: string): boolean {
  const maxLength = 999
  const head = jsonText.substring(0, maxLength).trim()
  return !head.includes('\n') && DELIMITER_WITHOUT_SPACING_REGEX.test(head)
}

// This regex matches cases of a comma or colon NOT followed by a whitespace
const DELIMITER_WITHOUT_SPACING_REGEX = /[,:]\S/
