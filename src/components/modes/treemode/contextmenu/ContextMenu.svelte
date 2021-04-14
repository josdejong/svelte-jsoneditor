<svelte:options immutable={true} />

<script>
  import {
    faCaretSquareDown,
    faCaretSquareUp,
    faClone,
    faCopy,
    faCropAlt,
    faCut,
    faFilter,
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
  export let onInsertBefore
  export let onInsert
  export let onInsertAfter
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

  $: insertText = hasSelectionContents
    ? 'Replace with'
    : 'Insert'

  function handleEditKey () {
    onCloseContextMenu()
    onEditKey()
  }

  function handleEditValue () {
    onCloseContextMenu()
    onEditValue()
  }

  function handleCut () {
    onCloseContextMenu()
    onCut()
  }

  function handleCopy () {
    onCloseContextMenu()
    onCopy()
  }

  function handlePaste () {
    onCloseContextMenu()
    onPaste()
  }

  function handleRemove () {
    onCloseContextMenu()
    onRemove()
  }

  function handleDuplicate () {
    onCloseContextMenu()
    onDuplicate()
  }

  function handleExtract () {
    onCloseContextMenu()
    onExtract()
  }

  function handleInsert (type) {
    onCloseContextMenu()
    onInsert(type)
  }

  function handleSort () {
    onCloseContextMenu()
    onSort()
  }

  function handleTransform () {
    onCloseContextMenu()
    onTransform()
  }

  function handleInsertBefore () {
    onCloseContextMenu()
    onInsertBefore()
  }

  function handleInsertAfter () {
    onCloseContextMenu()
    onInsertAfter()
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
    <div class="column">
      <button on:click={handleRemove} disabled={!hasSelectionContents}>
        <Icon data={faTimes} /> Remove
      </button>
      <button on:click={handleDuplicate} disabled={!canDuplicate}>
        <Icon data={faClone} /> Duplicate
      </button>
      <button on:click={handleExtract} disabled={!canExtract}>
        <Icon data={faCropAlt} /> Extract
      </button>
      <button on:click={handleSort} disabled={!hasSelectionContents}>
        <Icon data={faSortAmountDownAlt} /> Sort
      </button>
      <button on:click={handleTransform} disabled={!hasSelectionContents}>
        <Icon data={faFilter} /> Transform
      </button>
    </div>
    <div class="column">
      <button
        on:click={() => handleInsert('structure')}
        title="${insertText} structure"
        disabled={!hasSelection}
      >
        <span class="insert"><span class="plus">{'+'}</span></span> {insertText} structure
      </button>
      <button
        on:click={() => handleInsert('object')}
        title="{insertText} object"
        disabled={!hasSelection}
      >
        <span class="insert">{'{}'}</span> {insertText} object
      </button>
      <button
        on:click={() => handleInsert('array')}
        title="{insertText} array"
        disabled={!hasSelection}
      >
        <span class="insert">[]</span> {insertText} array
      </button>
      <button
        on:click={() => handleInsert('value')}
        title="{insertText} value"
        disabled={!hasSelection}
      >
        <span class="insert"><span class="quote">"</span></span> {insertText} value
      </button>
    </div>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button
      title="Select area before current entry to insert or paste contents"
      disabled={!hasSelectionContents}
      on:click={handleInsertBefore}
    >
      <Icon data={faCaretSquareUp} /> Insert before
    </button>
    <button
      title="Select area after current entry to insert or paste contents"
      disabled={!hasSelectionContents}
      on:click={handleInsertAfter}
    >
      <Icon data={faCaretSquareDown} /> Insert after
    </button>
  </div>
</div>

<style src="./ContextMenu.scss"></style>
