<svelte:options immutable={true} />

<script lang="ts">
  import { isEmpty } from 'lodash-es'
  import { getContext } from 'svelte'
  import Select from 'svelte-select'
  import Header from './Header.svelte'
  import { getNestedPaths } from '$lib/utils/arrayUtils.js'
  import { pathToOption, stringifyJSONPath } from '../../utils/pathUtils.js'
  import { sortJson } from '$lib/logic/sort.js'
  import { sortModalStates } from './sortModalStates'
  import type { JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { createDebug } from '$lib/utils/debug.js'
  import type { JSONValue, OnSort } from '$lib/types.js'
  import { onEscape } from '$lib/actions/onEscape.js'
  import type { Context } from 'svelte-simple-modal'

  const debug = createDebug('jsoneditor:SortModal')

  export let id: string
  export let json: JSONValue // the whole document
  export let rootPath: JSONPath
  export let onSort: OnSort

  const { close } = getContext<Context>('simple-modal')

  const stateId = `${id}:${compileJSONPointer(rootPath)}`
  const selectedJson = getIn(json, rootPath)
  $: jsonIsArray = Array.isArray(selectedJson)
  $: paths = jsonIsArray && selectedJson !== undefined ? getNestedPaths(selectedJson) : undefined
  $: properties = paths ? paths.map(pathToOption) : undefined

  const asc = {
    value: 1,
    label: 'ascending'
  }
  const desc = {
    value: -1,
    label: 'descending'
  }
  const directions = [asc, desc]

  let selectedProperty = sortModalStates[stateId]?.selectedProperty
  let selectedDirection = sortModalStates[stateId]?.selectedDirection || asc
  let sortError: string | undefined = undefined

  $: {
    // remember the selected values for the next time we open the SortModal
    // just in memory, not persisted
    sortModalStates[stateId] = {
      selectedProperty,
      selectedDirection
    }

    debug('store state in memory', stateId, sortModalStates[stateId])
  }

  function handleSort() {
    try {
      sortError = undefined

      const itemPath: JSONPath = selectedProperty?.value || properties?.[0]?.value || []
      const direction = selectedDirection?.value
      const operations = sortJson(json, rootPath, itemPath, direction)
      onSort({ operations, rootPath, itemPath, direction })

      close()
    } catch (err) {
      sortError = String(err)
    }
  }

  function focus(element: HTMLElement) {
    element.focus()
  }
</script>

<div class="jse-modal jse-sort" use:onEscape={close}>
  <Header title={jsonIsArray ? 'Sort array items' : 'Sort object keys'} />

  <div class="jse-modal-contents">
    <table>
      <colgroup>
        <col width="25%" />
        <col width="75%" />
      </colgroup>
      <tbody>
        <tr>
          <th>Path</th>
          <td>
            <input
              class="jse-path"
              type="text"
              readonly
              title="Selected path"
              value={!isEmpty(rootPath) ? stringifyJSONPath(rootPath) : '(document root)'}
            />
          </td>
        </tr>
        {#if jsonIsArray && ((properties && properties?.length > 1) || selectedProperty === undefined)}
          <tr>
            <th>Property</th>
            <td>
              <Select showChevron items={properties} bind:value={selectedProperty} />
            </td>
          </tr>
        {/if}
        <tr>
          <th>Direction</th>
          <td>
            <Select
              showChevron
              clearable={false}
              items={directions}
              bind:value={selectedDirection}
            />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="jse-space">
      {#if sortError}
        <div class="jse-error">
          {sortError}
        </div>
      {/if}
    </div>

    <div class="jse-actions">
      <button
        type="button"
        class="jse-primary"
        on:click={handleSort}
        use:focus
        disabled={jsonIsArray && properties && properties?.length > 1 ? !selectedProperty : false}
      >
        Sort
      </button>
    </div>
  </div>
</div>

<style src="./SortModal.scss"></style>
