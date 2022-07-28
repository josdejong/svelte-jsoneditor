<script>
  import { JSONEditor } from 'svelte-jsoneditor'
  import { faCopy } from '@fortawesome/free-regular-svg-icons/index.es'

  let content = {
    text: undefined, // used when in text mode
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

  function handleCopy() {
    console.log('Custom copy button clicked')

    const contents =
      content.text !== undefined ? content.text : JSON.stringify(content.json, null, 2)

    navigator.clipboard.writeText(contents).catch((err) => console.error(err))
  }

  function handleRenderMenu(mode, items) {
    const separator = {
      separator: true
    }

    const customCopyButton = {
      onClick: handleCopy,
      icon: faCopy,
      title: 'Copy document to clipboard',
      className: 'custom-copy-button'
    }

    const space = {
      space: true
    }

    const itemsWithoutSpace = items.slice(0, items.length - 2)

    return itemsWithoutSpace.concat([separator, customCopyButton, space])
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
