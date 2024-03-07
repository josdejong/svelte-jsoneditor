<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import type { JSONParser } from '$lib/types'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { MAX_INLINE_OBJECT_CHARS } from '$lib/constants.js'

  export let path: JSONPath
  export let value: unknown
  export let parser: JSONParser
  export let isSelected: boolean
  export let containsSearchResult: boolean
  export let containsActiveSearchResult: boolean
  export let onEdit: (path: JSONPath) => void
</script>

<button
  type="button"
  class="jse-inline-value"
  class:jse-selected={isSelected}
  class:jse-highlight={containsSearchResult}
  class:jse-active={containsActiveSearchResult}
  on:dblclick={() => onEdit(path)}
>
  {truncate(parser.stringify(value) ?? '', MAX_INLINE_OBJECT_CHARS)}
</button>

<style src="./InlineValue.scss"></style>
