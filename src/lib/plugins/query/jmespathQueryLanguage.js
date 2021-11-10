import jmespath from 'jmespath'
import { getIn } from 'immutable-json-patch'

const description = `
<p>
  Enter a <a href="https://jmespath.org" target="_blank" rel="noopener noreferrer">JMESPath</a> query 
  to filter, sort, or transform the JSON data.
</p>
<p>
 To learn JMESPath, go to <a href="https://jmespath.org/tutorial.html" target="_blank" rel="noopener noreferrer">the interactive tutorial</a>.
</p>
`

/** @type {QueryLanguage} */
export const jmespathQueryLanguage = {
  id: 'jmespath',
  name: 'JMESPath',
  description: description,
  createQuery,
  executeQuery
}

/**
 * Build a JMESPath query based on query options coming from the wizard
 * @param {JSON} json   The JSON document for which to build the query.
 *                      Used for context information like determining
 *                      the type of values (string or number)
 * @param {QueryLanguageOptions} queryOptions
 * @return {string} Returns a query (as string)
 */
export function createQuery(json, queryOptions) {
  const { sort, filter, projection } = queryOptions
  let query = ''

  if (filter) {
    const examplePath = filter.field !== '@' ? ['0'].concat(parsePath('.' + filter.field)) : ['0']
    const exampleValue = getIn(json, examplePath)
    const value1 = typeof exampleValue === 'string' ? filter.value : parseString(filter.value)

    query +=
      '[? ' + filter.field + ' ' + filter.relation + ' ' + '`' + JSON.stringify(value1) + '`' + ']'
  } else {
    query += Array.isArray(json) ? '[*]' : '@'
  }

  if (sort) {
    if (sort.direction === 'desc') {
      query += ' | reverse(sort_by(@, &' + sort.field + '))'
    } else {
      query += ' | sort_by(@, &' + sort.field + ')'
    }
  }

  if (projection) {
    if (query[query.length - 1] !== ']') {
      query += ' | [*]'
    }

    if (projection.fields.length === 1) {
      query += '.' + projection.fields[0]
    } else if (projection.fields.length > 1) {
      query +=
        '.{' +
        projection.fields
          .map((value) => {
            const parts = value.split('.')
            const last = parts[parts.length - 1]
            return last + ': ' + value
          })
          .join(', ') +
        '}'
    } else {
      // values.length === 0
      // ignore
    }
  }

  return query
}

/**
 * Execute a JMESPath query
 * @param {JSON} json
 * @param {string} query
 * @return {JSON} Returns the transformed JSON
 */
export function executeQuery(json, query) {
  return jmespath.search(json, query)
}

// TODO: move parsePath to pathUtils.js?
/**
 * Parse a JSON path like '.items[3].name' into an array
 * @param {string} jsonPath
 * @return {Array}
 */
export function parsePath(jsonPath) {
  const path = []
  let i = 0

  function parseProperty() {
    let prop = ''
    while (jsonPath[i] !== undefined && /[\w$]/.test(jsonPath[i])) {
      prop += jsonPath[i]
      i++
    }

    if (prop === '') {
      throw new Error('Invalid JSON path: property name expected at index ' + i)
    }

    return prop
  }

  function parseIndex(end) {
    let name = ''
    while (jsonPath[i] !== undefined && jsonPath[i] !== end) {
      name += jsonPath[i]
      i++
    }

    if (jsonPath[i] !== end) {
      throw new Error('Invalid JSON path: unexpected end, character ' + end + ' expected')
    }

    return name
  }

  while (jsonPath[i] !== undefined) {
    if (jsonPath[i] === '.') {
      i++
      path.push(parseProperty())
    } else if (jsonPath[i] === '[') {
      i++

      if (jsonPath[i] === "'" || jsonPath[i] === '"') {
        const end = jsonPath[i]
        i++

        path.push(parseIndex(end))

        if (jsonPath[i] !== end) {
          throw new Error("Invalid JSON path: closing quote ' expected at index " + i)
        }
        i++
      } else {
        let index = parseIndex(']').trim()
        if (index.length === 0) {
          throw new Error('Invalid JSON path: array value expected at index ' + i)
        }
        // Coerce numeric indices to numbers, but ignore star
        index = index === '*' ? index : JSON.parse(index)
        path.push(index)
      }

      if (jsonPath[i] !== ']') {
        throw new Error('Invalid JSON path: closing bracket ] expected at index ' + i)
      }
      i++
    } else {
      throw new Error('Invalid JSON path: unexpected character "' + jsonPath[i] + '" at index ' + i)
    }
  }

  return path
}

/**
 * Cast contents of a string to the correct type.
 * This can be a string, a number, a boolean, etc
 * @param {String} str
 * @return {*} castedStr
 * @private
 */
export function parseString(str) {
  if (str === '') {
    return ''
  }

  const lower = str.toLowerCase()
  if (lower === 'null') {
    return null
  }
  if (lower === 'true') {
    return true
  }
  if (lower === 'false') {
    return false
  }

  const num = Number(str) // will nicely fail with '123ab'
  const numFloat = parseFloat(str) // will nicely fail with '  '
  if (!isNaN(num) && !isNaN(numFloat)) {
    return num
  }

  return str
}
