import { jsonquery } from '@josdejong/jsonquery'
import { parseString } from '../../utils/stringUtils.js'
import type { QueryLanguage, QueryLanguageOptions } from '../../types.js'
import type { JSONPath } from 'immutable-json-patch'

const description = `
<p>
  Enter a <a href="https://github.com/josdejong/jsonquery" target="_blank" 
  rel="noopener noreferrer"><code>jsonquery</code></a> function to filter, sort, or transform the data.
  You can use functions like <code>get</code>, <code>filter</code>,
  <code>sort</code>, <code>pick</code>, <code>groupBy</code>, <code>uniq</code>, etcetera.
</p>
`

export const jsonQueryLanguage: QueryLanguage = {
  id: 'jsonquery',
  name: 'jsonquery',
  description,
  createQuery,
  executeQuery
}

function createQuery(_json: unknown, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  const queryFunctions = []

  if (filter && filter.path && filter.relation && filter.value) {
    const filterValue = parseString(filter.value)
    const filterValueStr = JSON.stringify(filterValue)

    queryFunctions.push(
      `  ["filter", ${pathToString(filter.path)}, "${filter.relation}", ${filterValueStr}]`
    )
  }

  if (sort && sort.path && sort.direction) {
    queryFunctions.push(
      `  ["sort", ${pathToString(sort.path)}${sort.direction === 'desc' ? ', "desc"' : ''}]`
    )
  }

  if (projection && projection.paths) {
    if (projection.paths.length > 1) {
      const paths = projection.paths.map(pathToString)

      queryFunctions.push(`  ["pick", ${paths.join(', ')}]`)
    } else {
      const path = projection.paths[0]
      queryFunctions.push(`  ["get", ${pathToString(path)}]`)
    }
  }

  return queryFunctions.length === 1
    ? queryFunctions[0].trim()
    : `[\n${queryFunctions.join(',\n')}\n]`
}

function pathToString(path: JSONPath): JSONPath | string {
  return JSON.stringify(path.length === 1 ? path[0] : path)
}

function executeQuery(json: unknown, query: string): unknown {
  const output = jsonquery(json, JSON.parse(query))
  return output !== undefined ? output : null
}
