<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // used when in code mode
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
  With CSS variables you can change the theme color of the editor, in this case from blue to
  anthracite.
</p>

<!-- use a theme by adding its name to the container class -->
<div class="my-json-editor">
  <JSONEditor bind:content />
</div>

<style>
  .my-json-editor {
    --jse-menu-background: #383e42;
    --jse-menu-background-highlight: #4b5257;

    width: 500px;
    height: 300px;
  }
</style>
