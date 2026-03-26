<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  const maxDocumentSizeTextMode = 10 * 1024 * 1024

  let text = $state(
    '{\n' +
      '  "array": [1, 2, 3],\n' +
      '  "boolean": true,\n' +
      '  "color": "#82b92c",\n' +
      '  "null": null,\n' +
      '  "number": 123,\n' +
      '  "object": { "a": "b", "c": "d" },\n' +
      '  "string": "Hello World"\n' +
      '}'
  )
</script>

<svelte:head>
  <title>Read only | svelte-jsoneditor</title>
</svelte:head>

<h1>Read only</h1>

<p>Use JSONEditor in read-only mode, content in this example is supplied by a separate textarea:</p>

<div>
  <textarea bind:value={text} style="width: 700px; height: 200px"></textarea>
</div>

<div class="editor">
  <JSONEditor content={{ text }} readOnly="true" mode="text" {maxDocumentSizeTextMode} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
