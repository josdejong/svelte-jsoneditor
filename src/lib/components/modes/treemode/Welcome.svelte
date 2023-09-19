<svelte:options immutable={true} />

<script lang="ts">
  export let readOnly: boolean
  export let onCreateArray: () => void
  export let onCreateObject: () => void
</script>

<div class="jse-welcome">
  <div class="jse-space jse-before" />
  <div class="jse-contents">
    <div class="jse-welcome-title">Empty document</div>
    {#if !readOnly}
      <div class="jse-welcome-info">
        You can paste clipboard data using <b>Ctrl+V</b>, or use the following options:
      </div>
      <button title={"Create an empty JSON object (press '{')"} on:click={() => onCreateObject()}>Create object</button>
      <button title={"Create an empty JSON array (press '[')"} on:click={() => onCreateArray()}>Create array</button>
    {/if}
  </div>
  <div class="jse-space jse-after" />
</div>

<style src="./Welcome.scss"></style>
