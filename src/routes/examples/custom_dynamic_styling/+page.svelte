<script>
  import { JSONEditor } from 'svelte-jsoneditor'

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

  function handleClassName(path, value) {
    if (JSON.stringify(path) === '["object","c"]' || JSON.stringify(path) === '["string"]') {
      return 'custom-class-highlight'
    }

    if (value === true || value === false) {
      return 'custom-class-boolean'
    }

    return undefined
  }
</script>

<svelte:head>
  <title>Custom, dynamic styling | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom, dynamic styling</h1>

<p>
  You can apply dynamic styling depending on the document contents using <code>onClassName</code>.
  In this example, all boolean values get a red background, and nodes with paths
  <code>/string</code> and <code>/object/c</code> get a green background.
</p>

<div class="editor">
  <JSONEditor bind:content onClassName={handleClassName} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }

  :global(.custom-class-highlight) {
    --jse-contents-background-color: #bfff66;
    /*
     * note: you can override more css variables to
     * have the selection highlighted in the same theme.
     *
     * Relevant variables are:
     *
     *   --jse-contents-background-color
     *   --jse-selection-background-color
     *   --jse-selection-background-inactive-color
     *   --jse-hover-background-color
     *   --jse-context-menu-pointer-hover-background
     *   --jse-context-menu-pointer-background
     *   --jse-context-menu-pointer-background-highlight
     *   --jse-collapsed-items-background-color
     *   --jse-collapsed-items-selected-background-color
     */
  }

  :global(.jse-json-node.custom-class-boolean .jse-value) {
    background: #ffb5c2;
    color: #1a1a1a;
  }
</style>
