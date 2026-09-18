<script lang="ts">
  import { t } from '$lib/i18n/index.js'
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
    <div class="jse-welcome-title">{$t('emptyDocumentTitle')}</div>
    {#if !readOnly}
      <div class="jse-welcome-info">
        You can paste clipboard data using <b>Ctrl+V</b>, or use the following options:
      </div>
      <button title={"Create an empty JSON object (press '{')"} onclick={handleCreateObject}
        >{$t('createObject')}</button
      >
      <button title={"Create an empty JSON array (press '[')"} onclick={handleCreateArray}
        >{$t('createArray')}</button
      >
    {/if}
  </div>
  <div class="jse-space jse-after"></div>
</div>

<style src="./Welcome.scss"></style>
