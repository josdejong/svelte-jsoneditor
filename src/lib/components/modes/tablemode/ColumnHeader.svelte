<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import type { SortedColumn } from '$lib/types.js'
  import { SortDirection } from '$lib/types.js'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import Icon from 'svelte-awesome'
  import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty, isEqual } from 'lodash-es'
  import { MAX_HEADER_NAME_CHARACTERS, SORT_DIRECTION_NAMES } from '$lib/constants.js'
  import { truncate } from '$lib/utils/stringUtils.js'

  export let path: JSONPath
  export let sortedColumn: SortedColumn | undefined
  export let readOnly: boolean
  export let onSort: (sortedColumn: SortedColumn) => void

  // TODO: improve truncating of long column names when they are a deeply nested path: the last item from the path should be visible, and halfway the path is least interesting
  $: columnName = !isEmpty(path) ? stringifyJSONPath(path) : 'values'

  $: sortDirection =
    sortedColumn && isEqual(path, sortedColumn?.path) ? sortedColumn.sortDirection : undefined

  $: sortDirectionName = sortDirection ? SORT_DIRECTION_NAMES[sortDirection] : undefined

  function handleSort() {
    if (readOnly) {
      return
    }

    onSort({
      path,
      sortDirection: sortDirection === SortDirection.asc ? SortDirection.desc : SortDirection.asc
    })
  }
</script>

<button
  type="button"
  class="jse-column-header"
  class:jse-readonly={readOnly}
  on:click={handleSort}
  title={!readOnly ? columnName + ' (Click to sort the data by this column)' : columnName}
>
  <span class="jse-column-name">
    {truncate(columnName, MAX_HEADER_NAME_CHARACTERS)}
  </span>
  {#if sortDirection !== undefined}
    <span class="jse-column-sort-icon" title={`Currently sorted in ${sortDirectionName} order`}>
      <Icon data={sortDirection === SortDirection.asc ? faCaretDown : faCaretUp} />
    </span>
  {/if}
</button>

<style src="./ColumnHeader.scss"></style>
