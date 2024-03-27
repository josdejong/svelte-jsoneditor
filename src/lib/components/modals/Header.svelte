<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faTimes } from '@fortawesome/free-solid-svg-icons'
  import type { Context } from 'svelte-simple-modal'

  export let title = 'Modal'
  export let onClose: (() => void) | undefined = undefined

  const { close } = getContext<Context>('simple-modal')
</script>

<div class="jse-header">
  <div class="jse-title">
    {title}
  </div>
  <slot name="actions" />
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
