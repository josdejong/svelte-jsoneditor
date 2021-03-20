<script>
  import {
    faClone,
    faCopy,
    faCropAlt,
    faCut,
    faFilter,
    faMagic,
    faPaste,
    faPen,
    faSortAmountDownAlt,
    faTimes
  } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { SELECTION_TYPE } from '../../../../logic/selection.js'

  export let selection
  export let onCloseContextMenu
  export let onEditKey
  export let onEditValue
  export let onCut
  export let onCopy
  export let onPaste
  export let onRemove
  export let onDuplicate
  export let onExtract
  export let onInsert
  export let onSort
  export let onTransform

  $: hasSelection = selection != null
  $: hasSelectionContents = selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
    selection.type === SELECTION_TYPE.KEY ||
    selection.type === SELECTION_TYPE.VALUE
  )
  $: canDuplicate = selection != null &&
    (selection.type === SELECTION_TYPE.MULTI) &&
    !isEmpty(selection.focusPath) // must not be root
  $: canExtract = selection != null && (
      selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.VALUE
    ) &&
    !isEmpty(selection.focusPath) // must not be root
  $: canEdit = selection != null && (
    selection.type === SELECTION_TYPE.KEY ||
    selection.type === SELECTION_TYPE.VALUE ||
    (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)
  )

  function handleEditKey() {
    onCloseContextMenu()
    onEditKey()
  }

  function handleEditValue() {
    onCloseContextMenu()
    onEditValue()
  }

  function handleCut() {
    onCloseContextMenu()
    onCut()
  }

  function handleCopy() {
    onCloseContextMenu()
    onCopy()
  }

  function handlePaste() {
    onCloseContextMenu()
    onPaste()
  }

  function handleRemove() {
    onCloseContextMenu()
    onRemove()
  }

  function handleDuplicate() {
    onCloseContextMenu()
    onDuplicate()
  }

  function handleExtract() {
    onCloseContextMenu()
    onExtract()
  }

  function handleInsert(type) {
    onCloseContextMenu()
    onInsert(type)
  }

  function handleSort() {
    onCloseContextMenu()
    onSort()
  }

  function handleTransform() {
    onCloseContextMenu()
    onTransform()
  }

</script>

<div class="jsoneditor-contextmenu">
  <div class="row">
    <button on:click={handleEditKey} disabled={!canEdit}>
      <Icon data={faPen} /> Edit key
    </button>
    <button on:click={handleEditValue} disabled={!canEdit}>
      <Icon data={faPen} /> Edit value
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button on:click={handleCut} disabled={!hasSelectionContents}>
      <Icon data={faCut} /> Cut
    </button>
    <button on:click={handleCopy} disabled={!hasSelectionContents}>
      <Icon data={faCopy} /> Copy
    </button>
    <button on:click={handlePaste} disabled={!hasSelection}>
      <Icon data={faPaste} /> Paste
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button on:click={handleRemove} disabled={!hasSelectionContents}>
      <Icon data={faTimes} /> Remove
    </button>
    <button on:click={handleDuplicate} disabled={!canDuplicate}>
      <Icon data={faClone} /> Duplicate
    </button>
    <button on:click={handleExtract} disabled={!canExtract}>
      <Icon data={faCropAlt} /> Extract
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <div class="insert-text" class:disabled={true}>Insert before</div>
    <button disabled title="Insert structure"><Icon data={faMagic} /></button>
    <button disabled class="insert" title="Insert object">{'{}'}</button>
    <button disabled class="insert" title="Insert array">[]</button>
    <button disabled class="insert" title="Insert value">
      <span class="quote">"</span>
      &nbsp;
    </button>
  </div>
  <div class="row">
    <div class="insert-text" class:disabled="{!hasSelection}">
      {hasSelectionContents ? 'Replace' : 'Insert'}
    </div>
    <button
      on:click={() => handleInsert('structure')}
      title="Insert structure"
      disabled={!hasSelection}
    >
      <Icon data={faMagic} />
    </button>
    <button
      on:click={() => handleInsert('object')}
      class="insert"
      title="Insert object"
      disabled={!hasSelection}
    >
      {'{}'}
    </button>
    <button
      on:click={() => handleInsert('array')}
      class="insert"
      title="Insert array"
      disabled={!hasSelection}
    >
      []
    </button>
    <button
      on:click={() => handleInsert('value')}
      class="insert"
      title="Insert value"
      disabled={!hasSelection}
    >
      <span class="quote">"</span>
      &nbsp;
    </button>
  </div>
  <div class="row">
    <div class="insert-text" class:disabled={true}>Insert after</div>
    <button disabled title="Insert structure"><Icon data={faMagic} /></button>
    <button disabled class="insert" title="Insert object">{'{}'}</button>
    <button disabled class="insert" title="Insert array">[]</button>
    <button disabled class="insert" title="Insert value">
      <span class="quote">"</span>
      &nbsp;
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button on:click={handleSort} disabled={!hasSelectionContents}>
      <Icon data={faSortAmountDownAlt} /> Sort
    </button>
    <button on:click={handleTransform} disabled={!hasSelectionContents}>
      <Icon data={faFilter} /> Transform
    </button>
  </div>
</div>

<style src="./ContextMenu.scss"></style>
