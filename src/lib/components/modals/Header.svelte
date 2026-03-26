<svelte:options immutable={true} />

<script lang="ts">
import {
  faDownLeftAndUpRightToCenter,
  faTimes,
  faUpRightAndDownLeftFromCenter
} from '@fortawesome/free-solid-svg-icons'
import Icon from 'svelte-awesome'

export let title = 'Modal'
export let fullScreenButton = false
export let fullscreen = false
export let onClose: (() => void) | undefined = undefined
</script>

<div class="jse-header">
  <div class="jse-title">
    {title}
  </div>
  <slot name="actions" />
  {#if fullScreenButton}
    <button
      type="button"
      class="jse-fullscreen"
      title="Toggle full screen"
      on:click={() => (fullscreen = !fullscreen)}
    >
      <Icon data={fullscreen ? faDownLeftAndUpRightToCenter : faUpRightAndDownLeftFromCenter} />
    </button>
  {/if}
  <button type="button" class="jse-close" on:click={() => onClose?.()}>
    <Icon data={faTimes} />
  </button>
</div>

<style src="./Header.scss"></style>
