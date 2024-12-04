<script lang="ts">
  // code based on: https://svelte.dev/examples/modal
  import { onEscape } from '$lib/actions/onEscape.js'
  import { onDestroy, onMount } from 'svelte'
  import { classnames } from '$lib/utils/cssUtils.js'

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

<style lang="scss">
  @use '../../themes/defaults.scss';
  @use '../../styles.scss';

  dialog.jse-modal {
    border-radius: styles.$border-radius;
    font-size: defaults.$padding; // for some reason that I don't understand, the font-size of the dialog is used as margin around the dialog
    border: none;
    padding: 0;
    display: flex;
    min-width: 0;
    margin: auto;
    overflow: visible;
    transition:
      width 0.1s ease-in-out,
      height 0.1s ease-in-out;

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

    &::backdrop {
      background: defaults.$modal-overlay-background;
    }

    &[open] {
      animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    &[open]::backdrop {
      animation: fade 0.2s ease-out;
    }

    & .jse-modal-inner {
      @include styles.jse-modal-style;
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
      --border: #{defaults.$svelte-select-border};
      --item-is-active-bg: #{defaults.$svelte-select-item-is-active-bg};
      --border-radius: #{defaults.$svelte-select-border-radius};
      --background: #{defaults.$svelte-select-background};
      --padding: #{defaults.$svelte-select-padding};
      --multi-select-padding: #{defaults.$svelte-select-multi-select-padding};
      --font-size: #{defaults.$svelte-select-font-size};
      --height: 36px;
      --multi-item-height: 28px;
      --multi-item-margin: 2px;
      --multi-item-padding: 2px 8px;
      --multi-item-border-radius: 6px;
      --indicator-top: 8px;
    }
  }
</style>
