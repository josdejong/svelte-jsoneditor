<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import JSONRepairComponent from './repair/JSONRepairComponent.svelte'
  import { onEscape } from '$lib/actions/onEscape.js'
  import type { Context } from 'svelte-simple-modal'

  export let text
  export let onParse
  export let onRepair
  export let onApply

  const { close } = getContext<Context>('simple-modal')

  function handleApply(repairedText) {
    close()
    onApply(repairedText)
  }

  function handleCancel() {
    close()
  }
</script>

<div class="jse-modal jse-repair" use:onEscape={close}>
  <JSONRepairComponent
    bind:text
    {onParse}
    {onRepair}
    onApply={handleApply}
    onCancel={handleCancel}
  />
</div>

<style src="./JSONRepairModal.scss"></style>
