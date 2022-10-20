<svelte:options immutable={true} />

<script lang="ts">
  import type {
    AfterPatchCallback,
    Content,
    ExtendedSearchResultItem,
    JSONEditorContext,
    JSONPatchResult,
    JSONSelection,
    JSONParser,
    OnRenderValue,
    PastedJson,
    ValueNormalization
  } from '../../../types'
  import TableMenu from './menu/TableMenu.svelte'
  import type { JSONArray, JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isJSONArray } from 'immutable-json-patch'
  import { isTextContent } from '../../../utils/jsonUtils'
  import { getColumns } from '../../../logic/table.js'
  import { noop } from '../../../utils/noop'
  import { isEmpty } from 'lodash-es'
  import JSONValue from './JSONValue.svelte'
  import { createNormalizationFunctions } from '../../../utils/domUtils'
  import { createDebug } from '$lib/utils/debug'
  import { createDocumentState } from '$lib/logic/documentState'

  const debug = createDebug('jsoneditor:TableMode')

  export let readOnly = false
  export let externalContent
  export let mainMenuBar = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let parser: JSONParser
  export let onRenderValue: OnRenderValue
  export let onRenderMenu = noop

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  // FIXME: work out support for object and primitive value
  let items: JSONArray | undefined

  $: applyExternalContent(externalContent)

  let columns: JSONPath[]
  $: columns = isJSONArray(items) ? getColumns(items) : []

  let viewPortHeight = 600
  let scrollTop = 0
  let itemHeight = 22 // px // FIXME: measure the actual item height (else scroll goes too fast and will be jumpy on a touch screen)

  $: itemCount = Array.isArray(items) ? items.length : 0
  $: visibleItemCount = Math.ceil(viewPortHeight / itemHeight)
  $: startIndex = Math.max(
    Math.min(Math.floor(scrollTop / itemHeight), itemCount - visibleItemCount),
    0
  )
  $: endIndex = Math.min(startIndex + visibleItemCount, itemCount)
  $: invisibleStartSectionHeight = startIndex * itemHeight
  $: invisibleEndSectionHeight = (itemCount - endIndex) * itemHeight
  $: visibleItems = Array.isArray(items) ? items.slice(startIndex, endIndex) : []

  $: debug({ viewPortHeight, itemHeight, itemCount, startIndex, endIndex })

  const searchResultItems: ExtendedSearchResultItem[] | undefined = undefined // FIXME: implement support for search and replace
  const selection = undefined // FIXME: implement selecting contents

  let context: JSONEditorContext
  $: context = {
    readOnly,
    parser,
    normalization,
    getJson: () => items,
    getDocumentState: () => createDocumentState(), // FIXME: what to do with getDocumentState()? It's not relevant in TableMode
    findElement: () => null, // FIXME: what to do with getDocumentState()? It's not relevant in TableMode
    focus,
    onPatch: handlePatch,
    onSelect: handleSelect,
    onFind: handleFind,
    onPasteJson: handlePasteJson,
    onRenderValue
  }

  function applyExternalContent(content: Content) {
    if (isTextContent(content)) {
      try {
        const json = JSON.parse(content.text)
        if (isJSONArray(json)) {
          items = json
        } else {
          items = undefined
          // FIXME: handle non-Array json data
        }
      } catch (err) {
        // FIXME: handle invalid JSON
        console.error(err)
        items = undefined
      }
    } else {
      if (isJSONArray(content.json)) {
        items = content.json
      } else {
        items = undefined
        // FIXME: handle non-Array json data
      }
    }
  }

  function handlePatch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    // FIXME: implement handlePatch

    return {
      json: items,
      previousJson: items,
      undo: [],
      redo: []
    }
  }

  function handleSelect(selection: JSONSelection) {
    // FIXME: implement handleSelect
  }

  function handleFind(findAndReplace: boolean) {
    // FIXME: implement handleFind
  }

  function handlePasteJson(newPastedJson: PastedJson) {
    // FIXME: implement handlePasteJson
  }

  export function focus() {
    // FIXME: implement focus
  }

  function handleScroll(event: Event) {
    scrollTop = event.target.scrollTop
  }
</script>

<div class="jse-table-mode" class:no-main-menu={!mainMenuBar}>
  {#if mainMenuBar}
    <TableMenu {onRenderMenu} />
  {/if}
  <div class="jse-contents" bind:clientHeight={viewPortHeight} on:scroll={handleScroll}>
    {#if items && !isEmpty(columns)}
      <table class="jse-table-main">
        <tbody>
          <tr class="jse-table-row jse-table-row-header">
            <th class="jse-table-cell jse-table-cell-header" />
            {#each columns as column}
              <th class="jse-table-cell jse-table-cell-header">{column}</th>
            {/each}
          </tr>
          <tr class="jse-table-invisible-start-section">
            <td style:height={invisibleStartSectionHeight + 'px'} colspan={columns.length} />
          </tr>
          {#each visibleItems as item, visibleIndex}
            {@const index = startIndex + visibleIndex}
            <tr class="jse-table-row">
              <th class="jse-table-cell jse-table-cell-gutter">{index + 1}</th>
              {#each columns as column}
                <td class="jse-table-cell">
                  <JSONValue
                    path={[index].concat(column)}
                    value={item[column]}
                    isSelected={false}
                    enforceString={false}
                    {selection}
                    {searchResultItems}
                    {context}
                  />
                </td>
              {/each}
            </tr>
          {/each}

          <tr class="jse-table-invisible-end-section">
            <td style:height={invisibleEndSectionHeight + 'px'} colspan={columns.length} />
          </tr>
        </tbody>
      </table>
    {:else}
      Error: data is not a JSON Array containing objects
    {/if}
  </div>
</div>

<style src="./TableMode.scss"></style>
