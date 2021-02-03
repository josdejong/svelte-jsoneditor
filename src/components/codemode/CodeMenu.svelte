<script>
  import {
    faCompressArrowsAlt,
    faExpandArrowsAlt,
    faFilter,
    faRedo,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'

  export let readOnly = false
  export let onFormat
  export let onCompact
  export let onSort
  export let onTransform
  export let onUndo
  export let onRedo
  export let canUndo
  export let canRedo
</script>

<div class="menu">

  <button
    class="button format"
    disabled={readOnly}
    on:click={() => onFormat()}
    title="Format JSON"
  >
    <Icon data={faExpandArrowsAlt} />
  </button>
  <button
    class="button compact"
    disabled={readOnly}
    on:click={() => onCompact()}
    title="Compact JSON"
  >
    <Icon data={faCompressArrowsAlt} />
  </button>

  <div class="separator"></div>

  <button
    class="button sort"
    disabled={readOnly}
    on:click={() => onSort()}
    title="Sort"
  >
    <Icon data={faSortAmountDownAlt} />
  </button>
  <button
    class="button transform"
    disabled={readOnly}
    on:click={() => onTransform()}
    title="Transform contents (filter, sort, project)"
  >
    <Icon data={faFilter} />
  </button>

  <div class="separator"></div>

  <button
    class="button undo"
    disabled={!canUndo}
    on:click={() => onUndo()}
    title="Undo (Ctrl+Z)"
  >
    <Icon data={faUndo} />
  </button>
  <button
    class="button redo"
    disabled={!canRedo}
    on:click={() => onRedo()}
    title="Redo (Ctrl+Shift+Z)"
  >
    <Icon data={faRedo} />
  </button>

  <div class="empty-space"></div>

  <div class="powered-by">
    <a
      href="https://ace.c9.io/"
      target="_blank"
      rel='noopener noreferrer'
      title='Code mode is powered by Ace editor'
    >
      powered by ace
    </a>
  </div>
</div>

<style src="./CodeMenu.scss"></style>
