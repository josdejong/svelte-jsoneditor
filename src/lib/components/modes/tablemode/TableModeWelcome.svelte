<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { getIn, isJSONArray, isJSONObject } from 'immutable-json-patch'
  import type { JSONParser, OnChangeMode } from '$lib/types.js'
  import { Mode } from '$lib/types.js'
  import { valueType } from '$lib/utils/typeUtils.js'
  import { findNestedArrays } from '$lib/logic/table.js'
  import { isEmpty } from 'lodash-es'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'

  export let text: string | undefined
  export let json: unknown | undefined
  export let readOnly: boolean
  export let parser: JSONParser
  export let openJSONEditorModal: (path: JSONPath) => void
  export let extractPath: (path: JSONPath) => void
  export let onChangeMode: OnChangeMode
  export let onClick: () => void

  let nestedArrayPaths: JSONPath[]
  $: nestedArrayPaths = json
    ? findNestedArrays(json)
        .slice(0, 99)
        .filter((path) => path.length > 0)
    : []
  $: hasNestedArrays = !isEmpty(nestedArrayPaths)
  $: isEmptyDocument = json === undefined && (text === '' || text === undefined)

  $: documentType = hasNestedArrays
    ? 'Object with nested arrays'
    : isEmptyDocument
      ? 'An empty document'
      : isJSONObject(json)
        ? 'An object'
        : isJSONArray(json)
          ? 'An empty array' // note: can also be an array with objects but without properties
          : `A ${valueType(json, parser)}`

  function countItems(nestedArrayPath: JSONPath): number {
    return (getIn(json, nestedArrayPath) as JSONPath).length
  }
</script>

<div class="jse-table-mode-welcome" on:click={() => onClick()} role="none">
  <div class="jse-space jse-before"></div>

  <div class="jse-nested-arrays">
    <div class="jse-nested-arrays-title">{documentType}</div>
    <div class="jse-nested-arrays-info">
      {#if hasNestedArrays}
        An object cannot be opened in table mode. You can open a nested array instead, or open the
        document in tree mode.
      {:else if isEmptyDocument && !readOnly}
        An empty document cannot be opened in table mode. You can go to tree mode instead, or paste
        a JSON Array using <b>Ctrl+V</b>.
      {:else}
        {documentType} cannot be opened in table mode. You can open the document in tree mode instead.
      {/if}
    </div>
    {#each nestedArrayPaths as nestedArrayPath}
      {@const count = countItems(nestedArrayPath)}

      <div class="jse-nested-property">
        <div class="jse-nested-property-path">
          "{stringifyJSONPath(nestedArrayPath)}"
          <span class="jse-nested-property-count">({count} {count !== 1 ? 'items' : 'item'})</span>
        </div>

        <button
          type="button"
          class="jse-nested-array-action"
          on:click={() => openJSONEditorModal(nestedArrayPath)}
        >
          {readOnly ? 'View' : 'Edit'}
        </button>
        {#if !readOnly}
          <button
            type="button"
            class="jse-nested-array-action"
            on:click={() => extractPath(nestedArrayPath)}
          >
            Extract
          </button>
        {/if}
      </div>
    {/each}
    <button type="button" class="jse-nested-array-action" on:click={() => onChangeMode(Mode.tree)}>
      Switch to tree mode
    </button>
  </div>

  <div class="jse-space jse-after"></div>
</div>

<style src="./TableModeWelcome.scss"></style>
