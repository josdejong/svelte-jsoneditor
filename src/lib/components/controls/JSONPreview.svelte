<script lang="ts">
  import type { JSONParser } from '$lib/types'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { getText } from '$lib/utils/jsonUtils.js'
  import { MAX_CHARACTERS_TEXT_PREVIEW } from '$lib/constants.js'

  export let text: string | undefined
  export let json: unknown | undefined
  export let indentation: number | string
  export let parser: JSONParser

  $: content = json !== undefined ? { json } : { text: text || '' }
  $: truncated = truncate(getText(content, indentation, parser), MAX_CHARACTERS_TEXT_PREVIEW)
</script>

<div class="jse-json-preview">
  {truncated}
</div>

<style src="./JSONPreview.scss"></style>
