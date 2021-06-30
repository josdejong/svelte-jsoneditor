<svelte:options immutable={true} />

<script>
  import Select from 'svelte-select'
  import { getNestedPaths } from '../../utils/arrayUtils.js'
  import { stringifyPath } from '../../utils/pathUtils.js'
  import { createQuery } from '../../logic/jsCreateQuery.js'
  import { isEmpty, isEqual } from 'lodash-es'

  export let json
  export let onQuery

  // fields
  export let filterField
  export let filterRelation
  export let filterValue
  export let sortField
  export let sortDirection
  export let pickFields

  // options
  $: jsonIsArray = Array.isArray(json)
  $: paths = jsonIsArray ? getNestedPaths(json) : undefined
  $: pathsIncludingObjects = jsonIsArray ? getNestedPaths(json, true) : undefined
  $: fieldOptions = paths ? paths.map(pathToOption) : undefined
  $: pickFieldOptions = pathsIncludingObjects
    ? pathsIncludingObjects.map(pathToOption)
    : undefined

  const filterRelationOptions = ['==', '!=', '<', '<=', '>', '>='].map(relation => ({
    value: relation,
    label: relation
  }))

  const sortDirectionOptions = [
    { value: 'asc', label: 'ascending' },
    { value: 'desc', label: 'descending' }
  ]

  function pathToOption (path) {
    return {
      value: path,
      label: isEmpty(path)
        ? '(whole item)'
        : stringifyPath(path)
    }
  }

  let queryOptions = {}
  $: {
    const newQueryOptions = {}

    if (filterField && filterRelation && filterValue) {
      newQueryOptions.filter = {
        field: filterField.value,
        relation: filterRelation.value,
        value: filterValue
      }
    }

    if (sortField && sortDirection) {
      newQueryOptions.sort = {
        field: sortField.value,
        direction: sortDirection.value
      }
    }

    if (pickFields) {
      newQueryOptions.projection = {
        fields: pickFields.map(item => item.value)
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
      <div class='horizontal'>
        <Select
          containerClasses='filter-field'
          items={fieldOptions}
          bind:value={filterField}
        />
        <Select
          containerClasses='filter-relation'
          items={filterRelationOptions}
          bind:value={filterRelation}
        />
        <input
          class='filter-value'
          bind:value={filterValue}
        />
      </div>
    </td>
  </tr>
  <tr>
    <th>Sort</th>
    <td>
      <div class='horizontal'>
        <Select
          containerClasses='sort-field'
          items={fieldOptions}
          bind:value={sortField}
        />
        <Select
          containerClasses='sort-direction'
          items={sortDirectionOptions}
          bind:value={sortDirection}
        />
      </div>
    </td>
  </tr>
  <tr>
    <th>Pick</th>
    <td>
      <div class='horizontal'>
        <Select
          containerClasses='pick-fields'
          items={pickFieldOptions}
          isMulti
          bind:value={pickFields}
        />
      </div>
    </td>
  </tr>
</table>

<style src="./TransformWizard.scss"></style>
