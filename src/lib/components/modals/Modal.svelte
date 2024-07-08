<script lang="ts">
  // code based on: https://svelte.dev/examples/modal
  import { onEscape } from '$lib/actions/onEscape.js'
  import { onDestroy, onMount } from 'svelte'

  export let onClose: () => void

  let dialog: HTMLDialogElement

  onMount(() => dialog.showModal())
  onDestroy(() => dialog.close())

  function close() {
    onClose()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog bind:this={dialog} on:close={close} on:click|self={close}>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div on:click|stopPropagation use:onEscape={close}>
    <slot />
  </div>
</dialog>

<style lang="scss">
  @import '../../styles.scss';

  dialog {
    border-radius: $border-radius;
    border: none;
    padding: 0;
    display: flex;
  }

  dialog::backdrop {
    background: $modal-overlay-background;
  }

  dialog > div {
    padding: 0;
    flex: 1;
    display: flex;
  }

  dialog[open] {
    animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  dialog[open]::backdrop {
    animation: fade 0.2s ease-out;
  }

  @keyframes zoom {
    from {
      transform: scale(0.95);
    }
    to {
      transform: scale(1);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
