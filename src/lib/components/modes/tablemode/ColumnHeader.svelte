<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import type { SortedColumn } from '../../../types.ts'
  import { SortDirection } from '../../../types.ts'
  import { stringifyJSONPath, stripRootObject } from '../../../utils/pathUtils.js'
  import { Icon } from 'svelte-awesome'
  import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty, isEqual } from 'lodash-es'
  import { SORT_DIRECTION_NAMES } from '../../../constants.ts'

  export let path: JSONPath
  export let sortedColumn: SortedColumn | undefined
  export let onSort: (sortedColumn: SortedColumn) => void

  $: sortDirection = isEqual(path, sortedColumn?.path) ? sortedColumn.sortDirection : undefined
  $: sortDirectionName = SORT_DIRECTION_NAMES[sortDirection]

  function handleSort() {
    onSort({
      path,
      sortDirection: sortDirection === SortDirection.asc ? SortDirection.desc : SortDirection.asc
    })
  }
</script>

<button
  type="button"
  class="jse-column-header"
  on:click={handleSort}
  title="Sort the data on this column"
>
  <span class="jse-column-name">
    {!isEmpty(path) ? stripRootObject(stringifyJSONPath(path)) : 'values'}
  </span>
  {#if sortDirection !== undefined}
    <span class="jse-column-sort-icon" title={`Currently sorted in ${sortDirectionName} order`}>
      <Icon data={sortDirection === SortDirection.asc ? faCaretDown : faCaretUp} />
    </span>
  {/if}
</button>

<style src="./ColumnHeader.scss"></style>
