<svelte:options immutable={true} />

<script lang="ts">
  import JSONRepairComponent from './repair/JSONRepairComponent.svelte'
  import Modal from './Modal.svelte'

  export let text: string
  export let onParse: (text: string) => void
  export let onRepair: (text: string) => string
  export let onApply: (repairedText: string) => void
  export let onClose: () => void

  function handleApply(repairedText: string) {
    onApply(repairedText)
    onClose()
  }

  function handleCancel() {
    onClose()
  }
</script>

<Modal {onClose} className="jse-repair-modal">
  <JSONRepairComponent
    bind:text
    {onParse}
    {onRepair}
    onApply={handleApply}
    onCancel={handleCancel}
  />
</Modal>
