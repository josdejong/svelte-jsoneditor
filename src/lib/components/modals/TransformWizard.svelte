<svelte:options immutable={true} />

<script>
  import Select from 'svelte-select'
  import { getNestedPaths } from '../../utils/arrayUtils.js'
  import { stringifyPath } from '../../utils/pathUtils.js'
  import { isEmpty, isEqual } from 'lodash-es'

  export let json
  export let onQuery
  export let createQuery

  // fields
  export let filterPath
  export let filterRelation
  export let filterValue
  export let sortPath
  export let sortDirection
  export let projectionPaths

  // options
  $: jsonIsArray = Array.isArray(json)
  $: paths = jsonIsArray ? getNestedPaths(json) : undefined
  $: pathsIncludingObjects = jsonIsArray ? getNestedPaths(json, true) : undefined
  $: fieldOptions = paths ? paths.map(pathToOption) : undefined
  $: projectionOptions = pathsIncludingObjects ? pathsIncludingObjects.map(pathToOption) : undefined

  const filterRelationOptions = ['==', '!=', '<', '<=', '>', '>='].map((relation) => ({
    value: relation,
    label: relation
  }))

  const sortDirectionOptions = [
    { value: 'asc', label: 'ascending' },
    { value: 'desc', label: 'descending' }
  ]

  function pathToOption(path) {
    return {
      value: path,
      label: isEmpty(path) ? '(whole item)' : stringifyPath(path)
    }
  }

  let queryOptions = {}
  $: {
    const newQueryOptions = {}

    if (filterPath && filterRelation && filterValue) {
      newQueryOptions.filter = {
        path: filterPath.value,
        relation: filterRelation.value,
        value: filterValue
      }
    }

    if (sortPath && sortDirection) {
      newQueryOptions.sort = {
        path: sortPath.value,
        direction: sortDirection.value
      }
    }

    if (projectionPaths) {
      newQueryOptions.projection = {
        paths: projectionPaths.map((item) => item.value)
      }
    }

    if (!isEqual(newQueryOptions, queryOptions)) {
      queryOptions = newQueryOptions
      const query = createQuery(json, queryOptions)

      // console.log('query updated', query, queryOptions)

      onQuery(query)
    }
  }
</script>

<table class="transform-wizard">
  <tr>
    <th>Filter</th>
    <td>
      <div class="horizontal">
        <Select containerClasses="filter-field" items={fieldOptions} bind:value={filterPath} />
        <Select
          containerClasses="filter-relation"
          items={filterRelationOptions}
          bind:value={filterRelation}
        />
        <input class="filter-value" bind:value={filterValue} />
      </div>
    </td>
  </tr>
  <tr>
    <th>Sort</th>
    <td>
      <div class="horizontal">
        <Select containerClasses="sort-field" items={fieldOptions} bind:value={sortPath} />
        <Select
          containerClasses="sort-direction"
          items={sortDirectionOptions}
          bind:value={sortDirection}
        />
      </div>
    </td>
  </tr>
  <tr>
    <th>Pick</th>
    <td>
      <div class="horizontal">
        <Select
          containerClasses="projection-fields"
          items={projectionOptions}
          isMulti
          bind:value={projectionPaths}
        />
      </div>
    </td>
  </tr>
</table>

<style src="./TransformWizard.scss"></style>
