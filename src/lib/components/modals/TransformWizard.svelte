<svelte:options immutable={true} />

<script lang="ts">
  import Select from 'svelte-select'
  import { getNestedPaths } from '$lib/utils/arrayUtils.js'
  import { pathToOption } from '$lib/utils/pathUtils.js'
  import { createDebug } from '$lib/utils/debug.js'
  import { isEqual } from 'lodash-es'
  import type { JSONPath } from 'immutable-json-patch'
  import { setIn } from 'immutable-json-patch'
  import type { PathOption, QueryLanguageOptions } from '$lib/types.js'

  const debug = createDebug('jsoneditor:TransformWizard')

  export let json: unknown
  export let queryOptions: QueryLanguageOptions = {}
  export let onChange: (queryOptions: QueryLanguageOptions) => void

  // options
  $: jsonIsArray = Array.isArray(json)
  $: paths = jsonIsArray ? getNestedPaths(json) : []
  $: pathsIncludingObjects = jsonIsArray ? getNestedPaths(json, true) : []
  $: fieldOptions = paths.map(pathToOption)
  $: projectionOptions = pathsIncludingObjects ? pathsIncludingObjects.map(pathToOption) : []

  const filterRelationOptions = ['==', '!=', '<', '<=', '>', '>='].map((relation) => ({
    value: relation,
    label: relation
  }))

  const sortDirectionOptions = [
    { value: 'asc', label: 'ascending' },
    { value: 'desc', label: 'descending' }
  ]

  // TODO: the binding with the select boxes is very cumbersome. Can we simplify this?
  let filterPath = queryOptions?.filter?.path ? pathToOption(queryOptions.filter.path) : undefined
  let filterRelation =
    filterRelationOptions.find((option) => option.value === queryOptions.filter?.relation) ??
    filterRelationOptions[0]
  let filterValue = queryOptions?.filter?.value || ''
  let sortPath = queryOptions?.sort?.path ? pathToOption(queryOptions.sort.path) : undefined
  let sortDirection =
    sortDirectionOptions.find((option) => option.value === queryOptions.sort?.direction) ??
    sortDirectionOptions[0]

  $: projectionPaths =
    queryOptions?.projection?.paths && projectionOptions
      ? (queryOptions.projection.paths
          .map((path) => projectionOptions.find((option) => isEqual(option.value, path)))
          .filter((option) => !!option) as PathOption[])
      : undefined

  function changeFilterPath(path: JSONPath | undefined) {
    if (!isEqual(queryOptions?.filter?.path, path)) {
      debug('changeFilterPath', path)
      queryOptions = setIn(queryOptions, ['filter', 'path'], path, true)
      onChange(queryOptions)
    }
  }

  function changeFilterRelation(relation: string | undefined) {
    if (!isEqual(queryOptions?.filter?.relation, relation)) {
      debug('changeFilterRelation', relation)
      queryOptions = setIn(queryOptions, ['filter', 'relation'], relation, true)
      onChange(queryOptions)
    }
  }

  function changeFilterValue(value: string | undefined) {
    if (!isEqual(queryOptions?.filter?.value, value)) {
      debug('changeFilterValue', value)
      queryOptions = setIn(queryOptions, ['filter', 'value'], value, true)
      onChange(queryOptions)
    }
  }

  function changeSortPath(path: JSONPath | undefined) {
    if (!isEqual(queryOptions?.sort?.path, path)) {
      debug('changeSortPath', path)
      queryOptions = setIn(queryOptions, ['sort', 'path'], path, true)
      onChange(queryOptions)
    }
  }

  function changeSortDirection(direction: string | undefined) {
    if (!isEqual(queryOptions?.sort?.direction, direction)) {
      debug('changeSortDirection', direction)
      queryOptions = setIn(queryOptions, ['sort', 'direction'], direction, true)
      onChange(queryOptions)
    }
  }

  function changeProjectionPaths(paths: JSONPath[] | unknown) {
    if (!isEqual(queryOptions?.projection?.paths, paths)) {
      debug('changeProjectionPaths', paths)
      queryOptions = setIn(queryOptions, ['projection', 'paths'], paths, true)
      onChange(queryOptions)
    }
  }

  $: changeFilterPath(filterPath?.value)
  $: changeFilterRelation(filterRelation?.value)
  $: changeFilterValue(filterValue)
  $: changeSortPath(sortPath?.value)
  $: changeSortDirection(sortDirection?.value)
  $: changeProjectionPaths(projectionPaths ? projectionPaths.map((item) => item.value) : undefined)
</script>

<table class="jse-transform-wizard">
  <tbody>
    <tr>
      <th>Filter</th>
      <td>
        <div class="jse-horizontal">
          <Select
            class="jse-filter-path"
            showChevron
            items={fieldOptions}
            bind:value={filterPath}
          />
          <Select
            class="jse-filter-relation"
            showChevron
            clearable={false}
            items={filterRelationOptions}
            bind:value={filterRelation}
          />
          <input class="jse-filter-value" bind:value={filterValue} />
        </div>
      </td>
    </tr>
    <tr>
      <th>Sort</th>
      <td>
        <div class="jse-horizontal">
          <Select class="jse-sort-path" showChevron items={fieldOptions} bind:value={sortPath} />
          <Select
            class="jse-sort-direction"
            showChevron
            clearable={false}
            items={sortDirectionOptions}
            bind:value={sortDirection}
          />
        </div>
      </td>
    </tr>
    <tr>
      <th>Pick</th>
      <td>
        <div class="jse-horizontal">
          <Select
            class="jse-projection-paths"
            multiple
            showChevron
            items={projectionOptions}
            bind:value={projectionPaths}
          />
        </div>
      </td>
    </tr>
  </tbody>
</table>

<style src="./TransformWizard.scss"></style>
