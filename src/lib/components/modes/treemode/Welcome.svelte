<svelte:options immutable={true} />

<script>
  export let readOnly
</script>

<div class="jse-welcome">
  <div class="jse-space jse-before" />
  <div class="jse-contents">
    Empty document
    {#if !readOnly}
      <ul>
        <li>Click inside the editor</li>
        <li>Paste clipboard data using <span class="jse-bold">Ctrl+V</span></li>
        <li>Create a new object by typing <span class="jse-bold">&lbrace;</span></li>
        <li>Create a new array by typing <span class="jse-bold">[</span></li>
      </ul>
    {/if}
  </div>
  <div class="jse-space jse-after" />
</div>

<style src="./Welcome.scss"></style>
