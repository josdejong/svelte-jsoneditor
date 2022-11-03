<script lang="ts">
  import type { JSONArray, JSONObject } from 'lossless-json'
  import { isJSONArray } from 'immutable-json-patch'
  import type { JSONPath } from 'immutable-json-patch'

  export let path: JSONPath
  export let value: JSONArray | JSONObject
  export let isSelected: boolean
  export let onEdit: (path: JSONPath, value: JSONArray | JSONObject) => void

  $: count = isJSONArray(value) ? value.length : Object.keys(value).length
  $: description = (isJSONArray(value) ? 'item' : 'prop') + (count === 1 ? '' : 's')
</script>

<div class="jse-table-tag" class:jse-selected={isSelected}>
  <span class="jse-bracket">{isJSONArray(value) ? '[' : '{'}</span><button
    type="button"
    class="jse-tag"
    on:click={() => onEdit(path, value)}
  >
    {count}
    {description}
  </button><span class="jse-bracket">{isJSONArray(value) ? ']' : '}'}</span>
</div>

<style src="./TableTag.scss"></style>
