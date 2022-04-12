<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import { IS_MAC } from '../../utils/navigatorUtils.js'
  import Header from './Header.svelte'

  const { close } = getContext('simple-modal')

  const ctrl = IS_MAC ? '⌘' : 'Ctrl'
</script>

<div class="jse-jsoneditor-modal copy-paste">
  <Header title="Copying and pasting" />

  <div class="jse-contents">
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
      <button type="button" class="jse-primary" on:click={close}> Close </button>
    </div>
  </div>
</div>

<style src="./CopyPasteModal.scss"></style>
