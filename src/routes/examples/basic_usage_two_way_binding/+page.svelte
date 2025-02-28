<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = $state({
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
  })

  $inspect('content', content)
</script>

<svelte:head>
  <title>Basic usage (two-way binding) | svelte-jsoneditor</title>
</svelte:head>

<h1>Basic usage (two-way binding)</h1>

<p>
  Use JSONEditor utilizing two-way binding: bind property <code>content</code>, so it will
  automatically update on changes.
</p>

<div class="editor">
  <JSONEditor bind:content />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
