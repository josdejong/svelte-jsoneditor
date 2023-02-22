<script lang="ts">
  import type { isJSONArray, JSONArray, JSONObject, JSONPath } from 'immutable-json-patch'
  import type { JSONParser } from '$lib/types'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { MAX_INLINE_OBJECT_CHARS } from '$lib/constants.js'

  export let path: JSONPath
  export let value: JSONArray | JSONObject
  export let parser: JSONParser
  export let isSelected: boolean
  export let onEdit: (path: JSONPath) => void

  $: count = isJSONArray(value) ? value.length : Object.keys(value).length
  $: description = (isJSONArray(value) ? 'item' : 'prop') + (count === 1 ? '' : 's')
</script>

<button
  type="button"
  class="jse-inline-value"
  class:jse-selected={isSelected}
  on:dblclick={() => onEdit(path)}
>
  {truncate(parser.stringify(value), MAX_INLINE_OBJECT_CHARS)}
</button>

<style src="./InlineValue.scss"></style>
