<svelte:options immutable={true} />

<script lang="ts">
  export let readOnly: boolean
  export let onCreateArray: () => void
  export let onCreateObject: () => void
  export let onClick: () => void
</script>

<div class="jse-welcome" on:click={() => onClick()} role="none">
  <div class="jse-space jse-before"></div>
  <div class="jse-contents">
    <div class="jse-welcome-title">Empty document</div>
    {#if !readOnly}
      <div class="jse-welcome-info">
        You can paste clipboard data using <b>Ctrl+V</b>, or use the following options:
      </div>
      <button
        title={"Create an empty JSON object (press '{')"}
        on:click|stopPropagation={() => onCreateObject()}>Create object</button
      >
      <button
        title={"Create an empty JSON array (press '[')"}
        on:click|stopPropagation={() => onCreateArray()}>Create array</button
      >
    {/if}
  </div>
  <div class="jse-space jse-after"></div>
</div>

<style src="./Welcome.scss"></style>
