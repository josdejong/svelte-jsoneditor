<svelte:options immutable={true} />

<script lang="ts">
  import type { Content } from '../../../types'
  import TableMenu from './menu/TableMenu.svelte'
  import type { JSONArray, JSONPath } from 'immutable-json-patch'
  import { isJSONArray, isTextContent } from '../../../utils/jsonUtils'
  import { getColumns } from '../../../logic/table.js'
  import { noop } from '../../../utils/noop'
  import { isEmpty } from 'lodash-es'

  export let mainMenuBar = true
  export let externalContent: Content
  export let onRenderMenu = noop

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

  $: applyExternalContent(externalContent)

  let columns: JSONPath[]
  $: columns = isJSONArray(items) ? getColumns(items) : []
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
          {#each items as item}
            <tr class="jse-table-row">
              {#each columns as column}
                <td class="jse-table-cell">{item[column]}</td>
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
