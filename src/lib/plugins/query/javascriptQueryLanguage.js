import { createPropertySelector } from '../../utils/pathUtils.js'
import { parseString } from '../../utils/stringUtils.js'

const description = `
<p>
  Enter a JavaScript function to filter, sort, or transform the data.
</p>
`

/** @type {QueryLanguage} */
export const javascriptQueryLanguage = {
  id: 'javascript',
  name: 'JavaScript',
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
    const actualValueGetter = `item => item${createPropertySelector(filter.path)}`

    const filterValueStr =
      typeof parseString(filter.value) === 'string' ? `'${filter.value}'` : filter.value

    queryParts.push(
      `  data = data.filter(${actualValueGetter} ${filter.relation} ${filterValueStr})\n`
    )
  }

  if (sort && sort.path && sort.direction) {
    if (sort.direction === 'desc') {
      queryParts.push(
        `  data = data.slice().sort((a, b) => {\n` +
          `    // sort descending\n` +
          `    const valueA = a${createPropertySelector(sort.path)}\n` +
          `    const valueB = b${createPropertySelector(sort.path)}\n` +
          `    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0\n` +
          `  })\n`
      )
    } else {
      // sort direction 'asc'
      queryParts.push(
        `  data = data.slice().sort((a, b) => {\n` +
          `    // sort ascending\n` +
          `    const valueA = a${createPropertySelector(sort.path)}\n` +
          `    const valueB = b${createPropertySelector(sort.path)}\n` +
          `    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0\n` +
          `  })\n`
      )
    }
  }

  if (projection && projection.paths) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.paths.length > 1) {
      const paths = projection.paths.map((path) => {
        const name = path[path.length - 1] || 'item' // 'item' in case of having selected the whole item
        const item = `item${createPropertySelector(path)}`
        return `    ${JSON.stringify(name)}: ${item}`
      })

      queryParts.push(`  data = data.map(item => ({\n${paths.join(',\n')}})\n  )\n`)
    } else {
      const item = `item${createPropertySelector(projection.paths[0])}`

      queryParts.push(`  data = data.map(item => ${item})\n`)
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
