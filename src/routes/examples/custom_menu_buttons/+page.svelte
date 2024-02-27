<script lang="ts">
  import {
    JSONEditor,
    type MenuButton,
    type MenuItem,
    type MenuSeparator,
    type RenderMenuContext
  } from 'svelte-jsoneditor'
  import { faCopy } from '@fortawesome/free-regular-svg-icons'
  import copyToClipboard from '$lib/utils/copyToClipboard.js'

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd' },
      string: 'Hello World'
    }
  }

  async function handleCopy() {
    console.log('Custom copy button clicked')

    const contents =
      content.text !== undefined ? content.text : JSON.stringify(content.json, null, 2)

    await copyToClipboard(contents)
  }

  function handleRenderMenu(items: MenuItem[], context: RenderMenuContext): MenuItem[] | undefined {
    console.log('handleRenderMenu', { items, context })

    const separator: MenuSeparator = {
      type: 'separator'
    }

    const customCopyButton: MenuButton = {
      type: 'button',
      onClick: handleCopy,
      icon: faCopy,
      title: 'Copy document to clipboard',
      className: 'custom-copy-button'
    }

    const head = items.slice(0, items.length - 1)
    const tail = items.slice(items.length - 1) // the tail contains space

    return head.concat(separator, customCopyButton, tail)
  }
</script>

<svelte:head>
  <title>Custom menu buttons | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom menu buttons</h1>

<p>
  You can add/remove buttons from the main menu using <code>onRenderMenu</code>. In this example a
  button is added to quickly copy the document to the clipboard.
</p>

<div class="editor">
  <JSONEditor bind:content onRenderMenu={handleRenderMenu} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }

  :global(.custom-copy-button) {
    background: #ff3e00 !important;
  }
  :global(.custom-copy-button:hover),
  :global(.custom-copy-button:active) {
    background: #ff632f !important;
  }
</style>
