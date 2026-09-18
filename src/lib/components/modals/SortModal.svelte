<svelte:options immutable={true} />

<script lang="ts">
  import { isEmpty, isEqual } from 'lodash-es'
  import Select from 'svelte-select'
  import Header from './Header.svelte'
  import { getNestedPaths } from '$lib/utils/arrayUtils.js'
  import { pathToOption, stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { sortJson } from '$lib/logic/sort.js'
  import { sortModalStates } from './sortModalStates'
  import type { JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { createDebug } from '$lib/utils/debug.js'
  import type { OnSort } from '$lib/types.js'
  import { t } from '$lib/i18n/index.js'
  import Modal from './Modal.svelte'

  const debug = createDebug('jsoneditor:SortModal')

  export let id: string
  export let json: unknown // the whole document
  export let rootPath: JSONPath
  export let onSort: OnSort
  export let onClose: () => void

  $: selectedJson = getIn(json, rootPath)
  $: jsonIsArray = Array.isArray(selectedJson)
  $: paths = jsonIsArray ? getNestedPaths(selectedJson) : undefined
  $: properties = paths ? paths.map((path) => pathToOption(path, $t('itemRoot'))) : undefined

  $: directions = [
    { value: 1 as const, label: $t('sortAscending') },
    { value: -1 as const, label: $t('sortDescending') }
  ]

  const stateId = `${id}:${compileJSONPointer(rootPath)}`

  // the selected values are kept as plain values and not as the options of the
  // select boxes, so that the labels of the options follow the language
  let selectedPath: JSONPath | undefined = sortModalStates[stateId]?.selectedPath
  let selectedDirectionValue: 1 | -1 = sortModalStates[stateId]?.selectedDirection ?? 1
  let sortError: string | undefined = undefined

  $: selectedProperty = properties?.find((option) => isEqual(option.value, selectedPath))
  $: selectedDirection =
    directions.find((option) => option.value === selectedDirectionValue) ?? directions[0]

  $: {
    // remember the selected values for the next time we open the SortModal
    // just in memory, not persisted
    sortModalStates[stateId] = {
      selectedPath,
      selectedDirection: selectedDirectionValue
    }

    debug('store state in memory', stateId, sortModalStates[stateId])
  }

  function handleSort() {
    try {
      sortError = undefined

      const itemPath: JSONPath = selectedProperty?.value || properties?.[0]?.value || []
      const direction = selectedDirection?.value
      const operations = sortJson(json, rootPath, itemPath, direction)
      if (onSort !== undefined && rootPath !== undefined) {
        onSort({ operations, rootPath, itemPath, direction })
      }

      onClose()
    } catch (err) {
      sortError = String(err)
    }
  }

  function focus(element: HTMLElement) {
    element.focus()
  }
</script>

<Modal {onClose} className="jse-sort-modal">
  <Header title={jsonIsArray ? $t('sortArrayItems') : $t('sortObjectKeys')} {onClose} />

  <div class="jse-modal-contents">
    <table>
      <colgroup>
        <col width="25%" />
        <col width="75%" />
      </colgroup>
      <tbody>
        <tr>
          <th>{$t('path')}</th>
          <td>
            <input
              class="jse-path"
              type="text"
              readonly
              title={$t('selectedPath')}
              value={rootPath && !isEmpty(rootPath)
                ? stringifyJSONPath(rootPath)
                : `(${$t('docRoot')})`}
            />
          </td>
        </tr>
        {#if jsonIsArray && properties && properties?.length > 1}
          <tr>
            <th>{$t('property')}</th>
            <td>
              <Select
                showChevron
                placeholder={$t('pleaseSelect')}
                items={properties}
                value={selectedProperty}
                on:input={(event) => (selectedPath = event.detail?.value)}
                on:clear={() => (selectedPath = undefined)}
              />
            </td>
          </tr>
        {/if}
        <tr>
          <th>{$t('direction')}</th>
          <td>
            <Select
              showChevron
              clearable={false}
              items={directions}
              value={selectedDirection}
              on:input={(event) => (selectedDirectionValue = event.detail?.value)}
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
        {$t('sort')}
      </button>
    </div>
  </div>
</Modal>

<style src="./SortModal.scss"></style>
