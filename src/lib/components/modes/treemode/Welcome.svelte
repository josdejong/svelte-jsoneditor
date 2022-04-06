<svelte:options immutable={true} />

<script>
  export let readOnly
</script>

<div class="welcome">
  <div class="space before" />
  <div class="contents">
    Empty document
    {#if !readOnly}
      <ul>
        <li>Click inside the editor</li>
        <li>Paste clipboard data using <span class="bold">Ctrl+V</span></li>
        <li>Create a new object by typing <span class="bold">&lbrace;</span></li>
        <li>Create a new array by typing <span class="bold">[</span></li>
      </ul>
    {/if}
  </div>
  <div class="space after" />
</div>

<style src="./Welcome.scss"></style>
