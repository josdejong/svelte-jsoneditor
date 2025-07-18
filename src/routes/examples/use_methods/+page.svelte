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

  function expandAll() {
    refJsonEditor.expand([], () => true)
  }

  function collapseAll() {
    refJsonEditor.collapse([], true)
  }

  // Expand specified key function
  function expandSpecificKey(keyPath) {
    refJsonEditor.expand(keyPath)
  }

  // Collapse specified key function  
  function collapseSpecificKey(keyPath) {
    refJsonEditor.collapse(keyPath)
  }

  // Test function - expand object 
  function expandObject() {
    expandSpecificKey(['object'])
  }

  // Test function - collapse object
  function collapseObject() {
    collapseSpecificKey(['object'])
  }

  // Test function - expand array
  function expandArray() {
    expandSpecificKey(['array'])
  }

  // Test function - collapse array
  function collapseArray() {
    collapseSpecificKey(['array'])
  }

  // Test function - expand object.nested (if exists)
  function expandObjectNested() {
    // First expand object, then expand its nested property (if exists)
    refJsonEditor.expand(['object'])
    // Give a small delay to ensure object is expanded
    setTimeout(() => {
      if (content.json.object && content.json.object.nested) {
        refJsonEditor.expand(['object', 'nested'])
      }
    }, 100)
  }

  // Test function - collapse object.nested
  function collapseObjectNested() {
    collapseSpecificKey(['object', 'nested'])
  }
</script>

<svelte:head>
  <title>Use methods | svelte-jsoneditor</title>
</svelte:head>

<h1>Use methods</h1>
<p>You can call methods on the editor by creating a reference to the editor instance.</p>

<p>
  <button type="button" onclick={expandAll}>Expand All</button>
  <button type="button" onclick={collapseAll}>Collapse All</button>
</p>

<p>
  <strong>Test expand/collapse specific keys:</strong>
</p>

<p>
  <button type="button" onclick={expandObject}>Expand object</button>
  <button type="button" onclick={collapseObject}>Collapse object</button>
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
  }
</style>
