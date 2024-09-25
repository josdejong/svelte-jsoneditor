import { JSONPath as JSONPathPlus } from 'jsonpath-plus'
import { parseString } from '$lib/utils/stringUtils'
import type { QueryLanguage, QueryLanguageOptions } from '$lib/types'
import type { JSONPath } from 'immutable-json-patch'

const description = `
<p>
  Enter a <a href="https://github.com/JSONPath-Plus/JSONPath" target="_blank" 
  rel="noopener noreferrer"><code>JSONPath</code></a> expression to filter, sort, or transform the data.
</p>`

export const jsonpathQueryLanguage: QueryLanguage = {
  id: 'jsonpath',
  name: 'JSONPath',
  description,
  createQuery,
  executeQuery
}

function createQuery(_json: unknown, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  let expression = '$'

  if (filter && filter.path && filter.relation && filter.value) {
    const filterValue = parseString(filter.value)
    const filterValueStr = JSON.stringify(filterValue)

    expression += `[?(@${pathToString(filter.path)} ${filter.relation} ${filterValueStr})]`
  }

  if (sort && sort.path && sort.direction) {
    throw new Error('Sorting is not supported by JSONPath. Please clear the sorting fields')
  }

  if (projection && projection.paths) {
    if (projection.paths.length > 1) {
      throw new Error(
        'Picking multiple fields is not supported by JSONPath. Please select only one field'
      )
    }

    if (!expression.endsWith(']')) {
      expression += '[*]'
    }
    expression += `${pathToString(projection.paths[0])}`.replace(/^\.\.\./, '..')
  }

  return expression
}

function executeQuery(json: unknown, path: string): unknown {
  const output = JSONPathPlus({ json: json as JSON, path })
  return output !== undefined ? output : null
}

function pathToString(path: JSONPath): JSONPath | string {
  const lettersOnlyRegex = /^[A-z]+$/

  return path
    .map((prop) => {
      return lettersOnlyRegex.test(prop) ? `.${prop}` : JSON.stringify([prop])
    })
    .join('')
}
