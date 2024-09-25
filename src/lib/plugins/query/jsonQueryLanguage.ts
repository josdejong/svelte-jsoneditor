import { jsonquery, type JSONQuery, parse, stringify } from '@jsonquerylang/jsonquery'
import { parseString } from '$lib/utils/stringUtils.js'
import type { QueryLanguage, QueryLanguageOptions } from '$lib/types.js'
import type { JSONPath } from 'immutable-json-patch'

const description = `
<p>
  Enter a <a href="https://jsonquerylang.org" target="_blank" 
  rel="noopener noreferrer">JSON Query</a> function to filter, sort, or transform the data.
  You can use functions like <code>get</code>, <code>filter</code>,
  <code>sort</code>, <code>pick</code>, <code>groupBy</code>, <code>uniq</code>, etcetera. 
  Example query: <code>filter(.age >= 18)</code>
</p>
`

export const jsonQueryLanguage: QueryLanguage = {
  id: 'jsonquery',
  name: 'JSONQuery',
  description,
  createQuery,
  executeQuery
}

function createQuery(_json: unknown, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  const queryFunctions: JSONQuery[] = []

  if (filter && filter.path && filter.relation && filter.value) {
    queryFunctions.push([
      'filter',
      [
        getOperatorName(filter.relation),
        getter(filter.path),
        parseString(filter.value) as JSONQuery
      ]
    ])
  }

  if (sort && sort.path && sort.direction) {
    queryFunctions.push(['sort', getter(sort.path), sort.direction === 'desc' ? 'desc' : 'asc'])
  }

  if (projection && projection.paths) {
    if (projection.paths.length > 1) {
      queryFunctions.push(['pick', ...projection.paths.map(getter)])
    } else {
      queryFunctions.push(['map', getter(projection.paths[0])])
    }
  }

  return stringify(['pipe', ...queryFunctions])
}

function getter(path: JSONPath): ['get', ...path: JSONPath] {
  return ['get', ...path]
}

function executeQuery(json: unknown, query: string): unknown {
  return query.trim() !== '' ? jsonquery(json, query) : json
}

function getOperatorName(operator: string): string {
  // a trick to get the name of the operator by parsing the operator in a temporary query
  return (parse(`1 ${operator} 1`) as [string, number, number])[0]
}
