<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import JSONRepairComponent from './repair/JSONRepairComponent.svelte'

  export let text
  export let onParse
  export let onRepair
  export let onApply
  export let onFocus
  export let onBlur
  export let onRenderMenu

  const { close } = getContext('simple-modal')

  function handleApply(repairedText) {
    close()
    onApply(repairedText)
  }

  function handleCancel() {
    close()
  }
</script>

<div class="jse-modal jse-repair">
  <JSONRepairComponent
    bind:text
    {onParse}
    {onRepair}
    onApply={handleApply}
    onCancel={handleCancel}
    {onFocus}
    {onBlur}
    {onRenderMenu}
  />
</div>

<style src="./JSONRepairModal.scss"></style>
