<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let refJsonEditor

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

  function expandAll() {
    refJsonEditor.expand(() => true)
  }

  function collapseAll() {
    refJsonEditor.expand(() => false)
  }
</script>

<svelte:head>
  <title>Use methods | svelte-jsoneditor</title>
</svelte:head>

<h1>Use methods</h1>
<p>You can call methods on the editor by creating a reference to the editor instance.</p>

<p>
  <button type="button" on:click={expandAll}>Expand All</button>
  <button type="button" on:click={collapseAll}>Collapse All</button>
</p>

<div class="editor">
  <JSONEditor bind:this={refJsonEditor} {content} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }

  button {
    font-family: inherit;
    font-size: inherit;
  }
</style>
