<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faTimes } from '@fortawesome/free-solid-svg-icons'

  export let title = 'Modal'
  export let onClose: (() => void) | undefined

  const { close } = getContext('simple-modal')
</script>

<div class="jse-header">
  <div class="jse-title">
    {title}
  </div>
  <button
    type="button"
    class="jse-close"
    on:click={() => {
      if (onClose) {
        onClose()
      } else {
        close()
      }
    }}
  >
    <Icon data={faTimes} />
  </button>
</div>

<style src="./Header.scss"></style>
