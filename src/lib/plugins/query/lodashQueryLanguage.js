import * as _ from 'lodash-es'
import { last } from 'lodash-es'
import { createPropertySelector, stringifyPath } from '../../utils/pathUtils.js'

const description = `
<p>
  Enter a JavaScript function to filter, sort, or transform the data.
  You can use <a href="https://lodash.com" target="_blank" rel="noopener noreferrer">Lodash</a>
  functions like <code>_.map</code>, <code>_.filter</code>,
  <code>_.orderBy</code>, <code>_.sortBy</code>, <code>_.groupBy</code>,
  <code>_.pick</code>, <code>_.uniq</code>, <code>_.get</code>, etcetera.
</p>
`

/** @type {QueryLanguage} */
export const lodashQueryLanguage = {
  id: 'lodash',
  name: 'Lodash',
  description,
  createQuery,
  executeQuery
}

export function createLodashPropertySelector(path) {
  return stringifyPath(path).replace(/^\./, '') // remove any leading dot
}

/**
 * @param {JSON} json
 * @param {QueryLanguageOptions} queryOptions
 * @returns {string}
 */
function createQuery(json, queryOptions) {
  const { filter, sort, projection } = queryOptions
  const queryParts = []

  if (filter && filter.path && filter.relation && filter.value) {
    // Note that the comparisons embrace type coercion,
    // so a filter value like '5' (text) will match numbers like 5 too.
    const getActualValue = `item => item${createPropertySelector(filter.path)}`

    queryParts.push(
      `  data = _.filter(data, ${getActualValue} ${filter.relation} '${filter.value}')\n`
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

/**
 * @param {JSON} json
 * @param {string} query
 * @returns {JSON}
 */
function executeQuery(json, query) {
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
