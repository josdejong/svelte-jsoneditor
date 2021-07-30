import { isEmpty, last } from 'lodash-es'

export function createQuery (json, queryOptions) {
  const { filter, sort, projection } = queryOptions
  const queryParts = []

  if (filter) {
    // Note that the comparisons embrace type coercion,
    // so a filter value like '5' (text) will match numbers like 5 too.
    const getActualValue = !isEmpty(filter.field)
      ? `item => _.get(item, ${JSON.stringify(filter.field)})`
      : 'item => item'
    queryParts.push(`  data = data.filter(${getActualValue} ${filter.relation} '${filter.value}')\n`)
  }

  if (sort) {
    queryParts.push(`  data = _.orderBy(data, ${JSON.stringify(sort.field)}, '${sort.direction}')\n`)
  }

  if (projection) {
    // It is possible to make a util function "pickFlat"
    // and use that when building the query to make it more readable.
    if (projection.fields.length > 1) {
      const fields = projection.fields.map(field => {
        const name = last(field) || 'item' // 'item' in case of having selected the whole item
        const item = !isEmpty(field)
          ? `_.get(item, ${JSON.stringify(field)})`
          : 'item'
        return `    ${JSON.stringify(name)}: ${item}`
      })
      queryParts.push(`  data = data.map(item => ({\n${fields.join(',\n')}})\n  )\n`)
    } else {
      const field = projection.fields[0]
      const item = !isEmpty(field)
        ? `_.get(item, ${JSON.stringify(field)})`
        : 'item'
      queryParts.push(`  data = data.map(item => ${item})\n`)
    }
  }

  queryParts.push('  return data\n')

  return `function query (data) {\n${queryParts.join('')}}`
}
