<svelte:options immutable={true} />

<script lang="ts">
  import { isMacDevice } from '$lib/utils/navigatorUtils.js'
  import Header from './Header.svelte'
  import Modal from './Modal.svelte'

  export let onClose: () => void

  const ctrl = isMacDevice() ? '⌘' : 'Ctrl'
</script>

<Modal {onClose} className="jse-copy-paste">
  <Header title="Copying and pasting" {onClose} />

  <div class="jse-modal-contents">
    <div>These actions are unavailable via the menu. Please use:</div>

    <div class="jse-shortcuts">
      <div class="jse-shortcut">
        <div class="jse-key">
          {ctrl}+C
        </div>
        for copy
      </div>
      <div class="jse-shortcut">
        <div class="jse-key">
          {ctrl}+X
        </div>
        for cut
      </div>
      <div class="jse-shortcut">
        <div class="jse-key">
          {ctrl}+V
        </div>
        for paste
      </div>
    </div>

    <div class="jse-actions">
      <button type="button" class="jse-primary" on:click={onClose}> Close </button>
    </div>
  </div>
</Modal>

<style src="./CopyPasteModal.scss"></style>
