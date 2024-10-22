import * as _ from 'lodash-es'
import { last } from 'lodash-es'
import { createLodashPropertySelector, createPropertySelector } from '$lib/utils/pathUtils.js'
import { parseString } from '$lib/utils/stringUtils.js'
import type { QueryLanguage, QueryLanguageOptions } from '$lib/types.js'
import { isInteger } from '$lib/utils/typeUtils.js'

const description = `
<p>
  Enter a JavaScript function to filter, sort, or transform the data.
  You can use <a href="https://lodash.com" target="_blank" rel="noopener noreferrer">Lodash</a>
  functions like <code>_.map</code>, <code>_.filter</code>,
  <code>_.orderBy</code>, <code>_.sortBy</code>, <code>_.groupBy</code>,
  <code>_.pick</code>, <code>_.uniq</code>, <code>_.get</code>, etcetera.
</p>
`

export const lodashQueryLanguage: QueryLanguage = {
  id: 'lodash',
  name: 'Lodash',
  description,
  createQuery,
  executeQuery
}

function createQuery(json: unknown, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  const queryParts = ['  return _.chain(data)\n']

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
    queryParts.push(
      `    .orderBy([${createLodashPropertySelector(sort.path)}], ['${sort.direction}'])\n`
    )
  }

  if (projection && projection.paths) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.paths.length > 1) {
      // Note that we do not use _.pick() here because this function doesn't flatten the results
      const paths = projection.paths.map((path) => {
        const name = last(path) || 'item' // 'item' in case of having selected the item root
        return `      ${JSON.stringify(name)}: item${createPropertySelector(path)}`
      })
      queryParts.push(`    .map(item => ({\n${paths.join(',\n')}\n    }))\n`)
    } else {
      const path = projection.paths[0]
      queryParts.push(`    .map(item => item${createPropertySelector(path)})\n`)
    }
  }

  queryParts.push('    .value()\n')

  return `function query (data) {\n${queryParts.join('')}}`
}

function executeQuery(json: unknown, query: string): unknown {
  validate(query)

  // TODO: only import the most relevant subset of lodash instead of the full library?
  const queryFn = new Function(
    '_',
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
  )(_)

  const output = queryFn(json)
  return output !== undefined ? output : null
}

function validate(query: string) {
  // It is very common to forget to end a lodash chain with .value()
  // This lets the JSON Editor crash though.
  // Therefore, we do a simple validation (not a guarantee)
  const chainCount = query.match(/_\.chain\(/g)?.length
  const valueCount = query.match(/\.value\(\)/g)?.length

  if (chainCount !== valueCount) {
    throw new Error('Cannot execute query: Lodash _.chain(...) must end with .value()')
  }
}
