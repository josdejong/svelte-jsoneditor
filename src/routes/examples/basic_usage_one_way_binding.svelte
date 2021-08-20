<script>
  import { JSONEditor } from '$lib' // replace this with 'svelte-jsoneditor'

  let json = {
    array: [1, 2, 3],
    boolean: true,
    color: '#82b92c',
    null: null,
    number: 123,
    object: { a: 'b', c: 'd' },
    string: 'Hello World'
  }
  let text = undefined // used when in code mode

  function handleChange(content) {
    console.log('contents changed:', { json, text })
    json = content.json
    text = content.text
  }
</script>

<svelte:head>
  <title>Basic usage (one-way binding) | svelte-jsoneditor</title>
</svelte:head>

<h1>Basic usage (one-way binding)</h1>

<p>
  Use JSONEditor with one-way binding: pass read-only properties <code>json</code> and
  <code>text</code>, and pass an <code>onChange</code> callback function to receive changes.
</p>

<div class="editor">
  <JSONEditor {json} {text} onChange={handleChange} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
