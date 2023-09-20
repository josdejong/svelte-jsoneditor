<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import JSONRepairComponent from './repair/JSONRepairComponent.svelte'
  import { onEscape } from '$lib/actions/onEscape.js'
  import type { Context } from 'svelte-simple-modal'

  export let text: string
  export let onParse: (text: string) => void
  export let onRepair: (text: string) => string
  export let onApply: (repairedText: string) => void

  const { close } = getContext<Context>('simple-modal')

  function handleApply(repairedText: string) {
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
