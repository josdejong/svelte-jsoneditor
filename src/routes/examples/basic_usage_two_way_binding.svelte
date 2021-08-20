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

  $: console.log('contents changed:', { json, text })
</script>

<svelte:head>
  <title>Basic usage (two-way binding) | svelte-jsoneditor</title>
</svelte:head>

<h1>Basic usage (two-way binding)</h1>

<p>
  Use JSONEditor utilizing two-way binding: bind properties <code>json</code> and
  <code>text</code>, so they will automatically update on changes.
</p>

<div class="editor">
  <JSONEditor bind:json bind:text />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
