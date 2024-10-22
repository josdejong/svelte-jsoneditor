import { createPropertySelector } from '$lib/utils/pathUtils.js'
import { parseString } from '$lib/utils/stringUtils.js'
import type { QueryLanguage, QueryLanguageOptions } from '$lib/types.js'
import { isInteger } from '$lib/utils/typeUtils.js'

const description = `
<p>
  Enter a JavaScript function to filter, sort, or transform the data.
</p>
`

export const javascriptQueryLanguage: QueryLanguage = {
  id: 'javascript',
  name: 'JavaScript',
  description,
  createQuery,
  executeQuery
}

function createQuery(json: unknown, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  const queryParts = ['  return data\n']

  if (filter && filter.path && filter.relation && filter.value) {
    // Note that the comparisons embrace type coercion,
    // so a filter value like '5' (text) will match numbers like 5 too.
    const actualValueGetter = `item => item${createPropertySelector(filter.path)}`

    const filterValue = parseString(filter.value)
    const filterValueStr =
      typeof filterValue === 'string'
        ? `'${filter.value}'`
        : isInteger(filter.value) && !Number.isSafeInteger(filterValue)
          ? `${filter.value}n` // bigint
          : filter.value

    queryParts.push(`    .filter(${actualValueGetter} ${filter.relation} ${filterValueStr})\n`)
  }

  if (sort && sort.path && sort.direction) {
    if (sort.direction === 'desc') {
      queryParts.push(
        `    .slice()\n` +
          `    .sort((a, b) => {\n` +
          `      // sort descending\n` +
          `      const valueA = a${createPropertySelector(sort.path)}\n` +
          `      const valueB = b${createPropertySelector(sort.path)}\n` +
          `      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0\n` +
          `    })\n`
      )
    } else {
      // sort direction 'asc'
      queryParts.push(
        `    .slice()\n` +
          `    .sort((a, b) => {\n` +
          `      // sort ascending\n` +
          `      const valueA = a${createPropertySelector(sort.path)}\n` +
          `      const valueB = b${createPropertySelector(sort.path)}\n` +
          `      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0\n` +
          `    })\n`
      )
    }
  }

  if (projection && projection.paths) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.paths.length > 1) {
      const paths = projection.paths.map((path) => {
        const name = path[path.length - 1] || 'item' // 'item' in case of having selected the item root
        const item = `item${createPropertySelector(path)}`
        return `      ${JSON.stringify(name)}: ${item}`
      })

      queryParts.push(`    .map(item => ({\n${paths.join(',\n')}})\n    )\n`)
    } else {
      const item = `item${createPropertySelector(projection.paths[0])}`

      queryParts.push(`    .map(item => ${item})\n`)
    }
  }

  return `function query (data) {\n${queryParts.join('')}}`
}

function executeQuery(json: unknown, query: string): unknown {
  // TODO: only import the most relevant subset of lodash instead of the full library?
  const queryFn = new Function(
    '"use strict";\n' +
      '\n' +
      query +
      '\n' +
      '\n' +
      'if (typeof query !== "function") {\n' +
      '  throw new Error("Cannot execute query: expecting a function named \'query\' but is undefined")\n' +
      '}\n' +
      '\n' +
      'return query;\n'
  )()

  const output = queryFn(json)
  return output !== undefined ? output : null
}
