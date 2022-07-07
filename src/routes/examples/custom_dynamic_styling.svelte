<script>
  import { JSONEditor } from 'svelte-jsoneditor'

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

  function handleClassName(path, value) {
    if (JSON.stringify(path) === '["object","c"]' || JSON.stringify(path) === '["string"]') {
      return 'custom-class-highlight'
    }

    if (value === true || value === false) {
      return 'custom-class-boolean'
    }
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

  :global(.jse-json-node.custom-class-highlight .jse-contents) {
    background: #bfff66;
  }

  :global(.jse-json-node.custom-class-boolean .jse-value) {
    background: #ffb5c2;
  }
</style>
