<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import JSONRepairComponent from '../modes/repairmode/RepairMode.svelte'

  export let text
  export let onParse
  export let onRepair
  export let onApply
  export let onFocus
  export let onBlur
  export let onRenderMenu

  const { close } = getContext('simple-modal')

  function handleApply (repairedText) {
    close()
    onApply(repairedText)
  }

  function handleCancel () {
    close()
  }
</script>

<JSONRepairComponent
  bind:text
  onParse={onParse}
  onRepair={onRepair}
  onApply={handleApply}
  onCancel={handleCancel}
  onFocus={onFocus}
  onBlur={onBlur}
  onRenderMenu={onRenderMenu}
/>
