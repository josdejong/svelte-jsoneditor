<script lang="ts">
  // code based on: https://svelte.dev/examples/modal
  import { onEscape } from '$lib/actions/onEscape.js'
  import { onDestroy, onMount } from 'svelte'

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

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialog}
  on:close={close}
  on:click|self={close}
  use:onEscape={close}
  class={className}
  class:jse-fullscreen={fullscreen}
>
  <div class="jse-modal">
    <slot />
  </div>
</dialog>

<style lang="scss">
  @import '../../styles.scss';

  dialog {
    border-radius: $border-radius;
    font-size: $padding; // for some reason that I don't understand, the font-size of the dialog is used as margin around the dialog
    border: none;
    padding: 0;
    display: flex;
    min-width: 0;
    overflow: visible;
    transition: width 0.1s ease-in-out, height 0.1s ease-in-out;

    &.jse-sort-modal {
      width: 400px;
    }

    &.jse-repair-modal {
      width: 600px;
      height: 500px;
    }

    &.jse-jsoneditor-modal {
      width: 800px;
      height: 600px;
    }

    &.jse-transform-modal {
      width: 1200px;
      height: 800px;
    }

    &.jse-fullscreen {
      width: 100%;
      height: 100%;
    }
  }

  dialog::backdrop {
    background: $modal-overlay-background;
  }

  dialog > .jse-modal {
    @include jse-modal-style;
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

  // styling for the select box, svelte-select
  // see docs: https://github.com/rob-balfre/svelte-select#css-custom-properties-variables
  :global(.svelte-select) {
    --border: #{$svelte-select-border};
    --item-is-active-bg: #{$svelte-select-item-is-active-bg};
    --border-radius: #{$svelte-select-border-radius};
    --background: #{$svelte-select-background};
    --padding: #{$svelte-select-padding};
    --multi-select-padding: #{$svelte-select-multi-select-padding};
    --font-size: #{$svelte-select-font-size};
    --height: 36px;
    --multi-item-height: 28px;
    --multi-item-margin: 2px;
    --multi-item-padding: 2px 8px;
    --multi-item-border-radius: 6px;
    --indicator-top: 8px;
  }
</style>
