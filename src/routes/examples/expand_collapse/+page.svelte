<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let refJsonEditor

  let content = $state({
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd', nested: { x: 'y', z: 'w' } },
      string: 'Hello World'
    }
  })
  function expandObject() {
    refJsonEditor.expand(['object'])
  }

  function collapseObject() {
    refJsonEditor.collapse(['object'], true)
  }

  function expandArray() {
    refJsonEditor.expand(['array'])
  }

  function collapseArray() {
    refJsonEditor.collapse(['array'])
  }

  function expandObjectNested() {
    refJsonEditor.expand(['object', 'nested'])
  }

  function collapseObjectNested() {
    refJsonEditor.collapse(['object', 'nested'])
  }
</script>

<svelte:head>
  <title>Expand/Collapse Specific Keys | svelte-jsoneditor</title>
</svelte:head>

<h1>Expand/Collapse Specific Keys</h1>
<p>This example demonstrates how to expand and collapse specific keys in the JSON editor.</p>

<p>
  <button type="button" onclick={expandObject}>Expand object</button>
  <button type="button" onclick={collapseObject}>Collapse object recursive</button>
  <button type="button" onclick={expandArray}>Expand array</button>
  <button type="button" onclick={collapseArray}>Collapse array</button>
</p>

<p>
  <button type="button" onclick={expandObjectNested}>Expand object.nested</button>
  <button type="button" onclick={collapseObjectNested}>Collapse object.nested</button>
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
    margin: 2px;
    padding: 5px 10px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
  }

  button:hover {
    background-color: #e0e0e0;
  }

  button:active {
    background-color: #d0d0d0;
  }
</style>
