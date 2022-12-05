<script lang="ts">
  import type { JSONParser } from '$lib/types'
  import type { JSONValue } from 'lossless-json'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { getText } from '$lib/utils/jsonUtils.js'
  import { MAX_CHARACTERS_TEXT_PREVIEW } from '$lib/constants.js'

  export let text: string | undefined
  export let json: JSONValue | undefined
  export let indentation: number | string
  export let parser: JSONParser
</script>

<div class="jse-json-preview">
  {truncate(getText({ text, json }, indentation, parser), MAX_CHARACTERS_TEXT_PREVIEW)}
</div>

<style src="./JSONPreview.scss"></style>
