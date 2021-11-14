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
 * Turn a path like:
 *
 *   ['location', 'latitude']
 *
 * into a JavaScript selector (string) like:
 *
 *   '?.["location"]?.["latitude"]'
 *
 * @param {Path} field
 * @returns {string}
 */
function createPropertySelector(field) {
  return field.map((f) => `?.[${JSON.stringify(f)}]`).join('')
}

/**
 * @param {JSON} json
 * @param {QueryLanguageOptions} queryOptions
 * @returns {string}
 */
function createQuery(json, queryOptions) {
  const { filter, sort, projection } = queryOptions
  const queryParts = []

  if (filter) {
    // Note that the comparisons embrace type coercion,
    // so a filter value like '5' (text) will match numbers like 5 too.
    const getActualValue = 'item => item' + createPropertySelector(filter.field)

    queryParts.push(
      `  data = data.filter(${getActualValue} ${filter.relation} '${filter.value}')\n`
    )
  }

  if (sort) {
    if (sort.direction === 'desc') {
      queryParts.push(
        `  data = data.slice().sort((a, b) => {\n` +
          `    // sort descending\n` +
          `    const valueA = a${createPropertySelector(sort.field)}\n` +
          `    const valueB = b${createPropertySelector(sort.field)}\n` +
          `    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0\n` +
          `  })\n`
      )
    } else {
      // sort direction 'asc'
      queryParts.push(
        `  data = data.slice().sort((a, b) => {\n` +
          `    // sort ascending\n` +
          `    const valueA = a${createPropertySelector(sort.field)}\n` +
          `    const valueB = b${createPropertySelector(sort.field)}\n` +
          `    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0\n` +
          `  })\n`
      )
    }
  }

  if (projection) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.fields.length > 1) {
      const fields = projection.fields.map((field) => {
        const name = field[field.length - 1] || 'item' // 'item' in case of having selected the whole item
        const item = 'item' + createPropertySelector(field)
        return `    ${JSON.stringify(name)}: ${item}`
      })

      queryParts.push(`  data = data.map(item => ({\n${fields.join(',\n')}})\n  )\n`)
    } else {
      const field = projection.fields[0]
      const item = 'item' + createPropertySelector(field)

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
  const queryFn = new Function(`'use strict'; return (${query})`)()
  return queryFn(json)
}
