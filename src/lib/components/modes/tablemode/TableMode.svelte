<svelte:options immutable={true} />

<script lang="ts">
  import type {
    AfterPatchCallback,
    Content,
    ExtendedSearchResultItem,
    JSONEditorContext,
    JSONPatchResult,
    JSONSelection,
    OnRenderValue,
    PastedJson,
    ValueNormalization
  } from '../../../types'
  import TableMenu from './menu/TableMenu.svelte'
  import type { JSONArray, JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isJSONArray, isTextContent } from '../../../utils/jsonUtils'
  import { getColumns } from '../../../logic/table.js'
  import { noop } from '../../../utils/noop'
  import { isEmpty } from 'lodash-es'
  import JSONValue from './JSONValue.svelte'
  import { createNormalizationFunctions } from '../../../utils/domUtils'

  export let readOnly = false
  export let externalContent
  export let mainMenuBar = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let onRenderValue: OnRenderValue
  export let onRenderMenu = noop

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  // FIXME: work out support for object and primitive value
  let items: JSONArray | undefined

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

  $: applyExternalContent(externalContent)

  let columns: JSONPath[]
  $: columns = isJSONArray(items) ? getColumns(items) : []

  const searchResultItems: ExtendedSearchResultItem[] | undefined = undefined // FIXME: implement support for search and replace
  const selection = undefined // FIXME: implement selecting contents

  let context: JSONEditorContext
  $: context = {
    readOnly,
    normalization,
    focus,
    onPatch: handlePatch,
    onSelect: handleSelect,
    onFind: handleFind,
    onPasteJson: handlePasteJson,
    onRenderValue
  }
</script>

<div class="jse-table-mode" class:no-main-menu={!mainMenuBar}>
  {#if mainMenuBar}
    <TableMenu {onRenderMenu} />
  {/if}
  <div class="jse-contents">
    {#if items && !isEmpty(columns)}
      <table class="jse-table-main">
        <tbody>
          <tr class="jse-table-row jse-table-row-header">
            {#each columns as column}
              <th class="jse-table-cell jse-table-cell-header">{column}</th>
            {/each}
          </tr>
          {#each items as item, index}
            <tr class="jse-table-row">
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
        </tbody>
      </table>
    {:else}
      Error: data is not a JSON Array containing objects
    {/if}
  </div>
</div>

<style src="./TableMode.scss"></style>
