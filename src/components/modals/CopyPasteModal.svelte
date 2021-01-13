<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import Header from './Header.svelte'

  const { close } = getContext('simple-modal')
</script>

<div class="jsoneditor-modal copy-paste">
  <Header title="Copying and pasting" />

  <div class="contents">
    <div>
      These actions are unavailable via the menu. Please use:
    </div>

    <div class="shortcuts">
      <div class="shortcut">
        <div class="key">
          Ctrl+C
        </div>
        for copy
      </div>
      <div class="shortcut">
        <div class="key">
          Ctrl+X
        </div>
        for cut
      </div>
      <div class="shortcut">
        <div class="key">
          Ctrl+V
        </div>
        for paste
      </div>
    </div>

    <div class="actions">
      <button
        class="primary"
        on:click={close}
      >
        Close
      </button>
    </div>
  </div>
</div>

<style src="./CopyPasteModal.scss"></style>
