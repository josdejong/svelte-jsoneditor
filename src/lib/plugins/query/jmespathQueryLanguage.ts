import jmespath from 'jmespath'
import type { JSONPath } from 'immutable-json-patch'
import { getIn } from 'immutable-json-patch'
import { parseString } from '$lib/utils/stringUtils.js'
import type { JSONParser, QueryLanguage, QueryLanguageOptions } from '$lib/types'
import { isEqualParser } from '$lib/utils/jsonUtils.js'

const description = `
<p>
  Enter a <a href="https://jmespath.org" target="_blank" rel="noopener noreferrer">JMESPath</a> query 
  to filter, sort, or transform the JSON data.
 To learn JMESPath, go to <a href="https://jmespath.org/tutorial.html" target="_blank" rel="noopener noreferrer">the interactive tutorial</a>.
</p>
`

export const jmespathQueryLanguage: QueryLanguage = {
  id: 'jmespath',
  name: 'JMESPath',
  description: description,
  createQuery,
  executeQuery
}

/**
 * Build a JMESPath query based on query options coming from the wizard
 * @param json   The JSON document for which to build the query.
 *                      Used for context information like determining
 *                      the type of values (string or number)
 * @param queryOptions
 * @return Returns a query (as string)
 */
function createQuery(json: unknown, queryOptions: QueryLanguageOptions): string {
  const { sort, filter, projection } = queryOptions
  let query = ''

  if (filter && filter.path && filter.relation && filter.value) {
    const examplePath = ['0'].concat(filter.path)
    const exampleValue = getIn(json, examplePath)
    const filterValue = parseString(filter.value)
    const filterValueStr =
      typeof exampleValue === 'string' && filterValue !== null && filterValue !== undefined
        ? `"${filter.value}"`
        : filterValue

    query +=
      '[? ' +
      stringifyPathForJmespath(filter.path) +
      ' ' +
      filter.relation +
      ' ' +
      '`' +
      filterValueStr +
      '`' +
      ']'
  } else {
    query += Array.isArray(json) ? '[*]' : '@'
  }

  if (sort && sort.path && sort.direction) {
    if (sort.direction === 'desc') {
      query += ' | reverse(sort_by(@, &' + stringifyPathForJmespath(sort.path) + '))'
    } else {
      query += ' | sort_by(@, &' + stringifyPathForJmespath(sort.path) + ')'
    }
  }

  if (projection && projection.paths) {
    if (query[query.length - 1] !== ']') {
      query += ' | [*]'
    }

    if (projection.paths.length === 1) {
      const path = projection.paths[0]

      query +=
        path.length === 0
          ? '' // edge case, selecting projection of the item root
          : '.' + stringifyPathForJmespath(path)
    } else if (projection.paths.length > 1) {
      query +=
        '.{' +
        projection.paths
          .map((path) => {
            const name = path[path.length - 1]
            return stringifyProp(name) + ': ' + stringifyPathForJmespath(path)
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
 * Execute a JMESPath query, returns the transformed JSON
 */
function executeQuery(json: unknown, query: string, parser: JSONParser): unknown {
  // JMESPath cannot handle non-native JSON data types like LosslessNumber

  function stringifyAndParse(json: unknown) {
    const text = parser.stringify(json)
    return text !== undefined ? JSON.parse(text) : undefined
  }

  const preprocessedJson = isEqualParser(parser, JSON) ? json : stringifyAndParse(json)

  return jmespath.search(preprocessedJson, query)
}

// TODO: unit test stringifyPathForJmespath
// TODO: Isn't there a helper function exposed by the JMESPath library?
export function stringifyPathForJmespath(path: JSONPath): string {
  if (path.length === 0) {
    return '@'
  }

  const str = path
    .map((prop) => {
      if (typeof prop === 'number') {
        return '[' + prop + ']'
      } else {
        return '.' + stringifyProp(String(prop))
      }
    })
    .join('')

  return str[0] === '.'
    ? str.slice(1) // remove first dot
    : str
}

function stringifyProp(prop: string): string {
  return prop.match(/^[A-Za-z\d_$]+$/) ? prop : JSON.stringify(prop)
}
