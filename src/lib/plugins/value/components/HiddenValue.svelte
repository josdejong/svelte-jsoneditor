<svelte:options immutable={true} />

<script>
  import Icon from 'svelte-awesome'
  import { faLock } from '@fortawesome/free-solid-svg-icons'
  import { createValueSelection } from 'svelte-jsoneditor'

  export let value
  export let path
  export let readOnly
  export let onSelect

  $: hiddenValue = '*'.repeat(String(value).length)

  function handleValueDoubleClick(event) {
    if (!readOnly) {
      event.preventDefault()
      event.stopPropagation()

      // open in edit mode
      onSelect(createValueSelection(path, true))
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
