<script lang="ts">
  import {
    type ContextMenuItem,
    JSONEditor,
    type RenderMenuContext,
    toTextContent
  } from 'svelte-jsoneditor'
  import { faCalculator } from '@fortawesome/free-solid-svg-icons'

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

  function handleCalculateSize() {
    const size = toTextContent(content).text.length

    alert(`The document size is ${size} bytes`)
  }

  function handleRenderContextMenu(
    items: ContextMenuItem[],
    context: RenderMenuContext
  ): ContextMenuItem[] | undefined {
    console.log('handleRenderContextMenu', { items, context })

    return [
      ...items,
      { type: 'separator' },
      {
        type: 'row',
        items: [
          {
            type: 'button',
            onClick: handleCalculateSize,
            icon: faCalculator,
            text: 'Calculate size',
            title: 'Calculate the size of the document and report that in an alert',
            disabled: false
          }
        ]
      }
    ]
  }
</script>

<svelte:head>
  <title>Custom context menu buttons | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom context menu buttons</h1>

<p>
  You can add/remove buttons from the context menu using <code>onRenderContextMenu</code>. The
  context menu can be opened by right-clicking on a key or value in the editor. In this example a
  button "Calculate size" is added, which opens an alert showing the size of the document.
</p>

<div class="editor">
  <JSONEditor bind:content onRenderContextMenu={handleRenderContextMenu} />
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
