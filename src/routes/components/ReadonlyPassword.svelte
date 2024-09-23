<svelte:options immutable={true} />

<script lang="ts">
  import Icon from 'svelte-awesome'
  import { faLock } from '@fortawesome/free-solid-svg-icons'
  import { createEditValueSelection, type OnSelect } from 'svelte-jsoneditor'
  import type { JSONPath } from 'immutable-json-patch'

  export let value: string
  export let path: JSONPath
  export let readOnly: boolean
  export let onSelect: OnSelect

  $: hiddenValue = '*'.repeat(Math.max(String(value).length, 3))

  function handleValueDoubleClick(event: Event) {
    if (!readOnly) {
      event.preventDefault()
      event.stopPropagation()

      // open in edit mode
      onSelect(createEditValueSelection(path))
    }
  }
</script>

<div
  role="button"
  tabindex="-1"
  class="jse-value jse-readonly-password"
  data-type="selectable-value"
  on:dblclick={handleValueDoubleClick}
>
  <Icon data={faLock} />
  {hiddenValue}
</div>

<style>
  .jse-readonly-password {
    padding: 0 5px;
  }

  .jse-readonly-password:hover {
    background: #ededed;
  }
</style>
