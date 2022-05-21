import * as _ from 'lodash-es'
import { last } from 'lodash-es'
import { createPropertySelector, stringifyPath } from '../../utils/pathUtils.js'
import { parseString } from '../../utils/stringUtils.js'
import type { JSONData, Path, QueryLanguage, QueryLanguageOptions } from '../../types'

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

function createQuery(json: JSONData, queryOptions: QueryLanguageOptions): string {
  const { filter, sort, projection } = queryOptions
  const queryParts = []

  if (filter && filter.path && filter.relation && filter.value) {
    // Note that the comparisons embrace type coercion,
    // so a filter value like '5' (text) will match numbers like 5 too.
    const actualValueGetter = `item => item${createPropertySelector(filter.path)}`

    const filterValueStr =
      typeof parseString(filter.value) === 'string' ? `'${filter.value}'` : filter.value

    queryParts.push(
      `  data = _.filter(data, ${actualValueGetter} ${filter.relation} ${filterValueStr})\n`
    )
  }

  if (sort && sort.path && sort.direction) {
    queryParts.push(
      `  data = _.orderBy(data, ['${createLodashPropertySelector(sort.path)}'], ['${
        sort.direction
      }'])\n`
    )
  }

  if (projection && projection.paths) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.paths.length > 1) {
      // Note that we do not use _.pick() here because this function doesn't flatten the results
      const paths = projection.paths.map((path) => {
        const name = last(path) || 'item' // 'item' in case of having selected the whole item
        return `    ${JSON.stringify(name)}: item${createPropertySelector(path)}`
      })
      queryParts.push(`  data = _.map(data, item => ({\n${paths.join(',\n')}\n  }))\n`)
    } else {
      const path = projection.paths[0]
      queryParts.push(`  data = _.map(data, item => item${createPropertySelector(path)})\n`)
    }
  }

  queryParts.push('  return data\n')

  return `function query (data) {\n${queryParts.join('')}}`
}

function executeQuery(json: JSONData, query: string): JSONData {
  // FIXME: replace unsafe new Function with a JS based query language
  //  As long as we don't persist or fetch queries, there is no security risk.
  // TODO: only import the most relevant subset of lodash instead of the full library?
  // eslint-disable-next-line no-new-func
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

/**
 * Create a Lodash string containing a path (without leading dot), like "users[2].name"
 */
function createLodashPropertySelector(path: Path): string {
  return stringifyPath(path).replace(/^\./, '') // remove any leading dot
}
