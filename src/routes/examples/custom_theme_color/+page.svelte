<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      string: 'Hello custom theme color :)'
    }
  }
</script>

<svelte:head>
  <title>Custom theme color with CSS variables | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom theme color</h1>

<p>
  With CSS variables you can change the theme color of the editor, in this case from the default
  blue color to deep pink.
</p>

<div class="my-json-editor">
  <JSONEditor bind:content />
</div>

<style>
  h1 {
    color: #ec1897;
  }

  .my-json-editor {
    /* define a custom theme color */
    --jse-theme-color: #ec1897;
    --jse-theme-color-highlight: #f553b5;

    width: 500px;
    height: 300px;
  }
</style>
