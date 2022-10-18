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

  function handleChange(updatedContent) {
    console.log('contents changed:', updatedContent)
    content = updatedContent
  }
</script>

<svelte:head>
  <title>Basic usage (one-way binding) | svelte-jsoneditor</title>
</svelte:head>

<h1>Basic usage (one-way binding)</h1>

<p>
  Use JSONEditor with one-way binding: pass read-only property <code>content</code>, and pass an
  <code>onChange</code> callback function to receive changes.
</p>

<div class="editor">
  <JSONEditor {content} onChange={handleChange} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
