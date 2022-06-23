<script>
  // @ts-nocheck

  import { JSONEditor } from "svelte-jsoneditor";

  let refJsonEditor;

  let content = {
    text: undefined,
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd' },
      string: 'Hello World'
    }
  };

  let mainMenuBar = false;
  let navigationBar = false;
  let readOnly = true;
  let mode = "code";

  function expandAll() {
    refJsonEditor.expand(() => true)
  }
</script>

<div class="container">
  <JSONEditor 
    bind:this={refJsonEditor} 
    bind:content 
    bind:mainMenuBar 
    bind:readOnly bind:mode
   />
</div>

<style>
   .container :global(.jse-main){
      min-height: 0px;
  }
</style>
