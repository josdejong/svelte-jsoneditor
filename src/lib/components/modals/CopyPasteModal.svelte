<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import { isMac } from '$lib/utils/navigatorUtils.js'
  import { onEscape } from '$lib/actions/onEscape.js'
  import Header from './Header.svelte'
  import type { Context } from 'svelte-simple-modal'

  const { close } = getContext<Context>('simple-modal')

  const ctrl = isMac() ? '⌘' : 'Ctrl'
</script>

<div class="jse-modal jse-copy-paste" use:onEscape={() => close()}>
  <Header title="Copying and pasting" />

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
      <button type="button" class="jse-primary" on:click={() => close()}> Close </button>
    </div>
  </div>
</div>

<style src="./CopyPasteModal.scss"></style>
