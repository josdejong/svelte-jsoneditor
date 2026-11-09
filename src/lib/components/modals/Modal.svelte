<script lang="ts">
  // code based on: https://svelte.dev/examples/modal
  import { onEscape } from '#lib/actions/onEscape.js'
  import { onDestroy, onMount } from 'svelte'
  import { classnames } from '#lib/utils/cssUtils.js'

  export let className: string | undefined = undefined
  export let fullscreen = false
  export let onClose: () => void

  let dialog: HTMLDialogElement

  onMount(() => dialog.showModal())
  onDestroy(() => dialog.close())

  function close() {
    onClose()
  }
</script>

<dialog
  bind:this={dialog}
  on:close={close}
  on:pointerdown|self={close}
  on:cancel|preventDefault
  use:onEscape={close}
  class={classnames('jse-modal', className)}
  class:jse-fullscreen={fullscreen}
>
  <div class="jse-modal-inner">
    <slot />
  </div>
</dialog>

<style src="./Modal.scss"></style>
