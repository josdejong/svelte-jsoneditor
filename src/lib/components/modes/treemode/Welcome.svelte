<script lang="ts">
  interface Props {
    readOnly: boolean
    onCreateArray: () => void
    onCreateObject: () => void
    onClick: () => void
  }

  const { readOnly, onCreateArray, onCreateObject, onClick }: Props = $props()

  function handleCreateObject(event: MouseEvent) {
    event.stopPropagation()
    onCreateObject()
  }

  function handleCreateArray(event: MouseEvent) {
    event.stopPropagation()
    onCreateArray()
  }
</script>

<div class="jse-welcome" onclick={() => onClick()} role="none">
  <div class="jse-space jse-before"></div>
  <div class="jse-contents">
    <div class="jse-welcome-title">Empty document</div>
    {#if !readOnly}
      <div class="jse-welcome-info">
        You can paste clipboard data using <b>Ctrl+V</b>, or use the following options:
      </div>
      <button title={"Create an empty JSON object (press '{')"} onclick={handleCreateObject}
        >Create object</button
      >
      <button title={"Create an empty JSON array (press '[')"} onclick={handleCreateArray}
        >Create array</button
      >
    {/if}
  </div>
  <div class="jse-space jse-after"></div>
</div>

<style src="./Welcome.scss"></style>
