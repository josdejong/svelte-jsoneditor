import * as _ from 'lodash-es'
import { isEmpty, last } from 'lodash-es'

const description = `
<p>
  Enter a JavaScript function to filter, sort, or transform the data.
</p>
<p>
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
    const getActualValue = !isEmpty(filter.path)
      ? `item => _.get(item, ${JSON.stringify(filter.path)})`
      : 'item => item'
    queryParts.push(
      `  data = _.filter(data, ${getActualValue} ${filter.relation} '${filter.value}')\n`
    )
  }

  if (sort && sort.path && sort.direction) {
    queryParts.push(
      `  data = _.orderBy(data, [${JSON.stringify(sort.path)}], ['${sort.direction}'])\n`
    )
  }

  if (projection && projection.paths) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.paths.length > 1) {
      const paths = projection.paths.map((path) => {
        const name = last(path) || 'item' // 'item' in case of having selected the whole item
        const item = !isEmpty(path) ? `_.get(item, ${JSON.stringify(path)})` : 'item'
        return `    ${JSON.stringify(name)}: ${item}`
      })
      queryParts.push(`  data = _.map(data, item => ({\n${paths.join(',\n')}})\n  )\n`)
    } else {
      const path = projection.paths[0]
      const item = !isEmpty(path) ? `_.get(item, ${JSON.stringify(path)})` : 'item'
      queryParts.push(`  data = _.map(data, item => ${item})\n`)
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
  const queryFn = new Function('_', `'use strict'; return (${query})`)(_)
  return queryFn(json)
}
