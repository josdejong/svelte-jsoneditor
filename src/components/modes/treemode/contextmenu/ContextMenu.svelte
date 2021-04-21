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
  import { getIn } from 'immutable-json-patch'
  import { initial, isEmpty } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { SELECTION_TYPE } from '../../../../logic/selection.js'
  import { isObjectOrArray } from '../../../../utils/typeUtils.js'

  export let json
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
  $: rootSelected = hasSelection && isEmpty(selection.focusPath)

  $: hasSelectionContents = selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
    selection.type === SELECTION_TYPE.KEY ||
    selection.type === SELECTION_TYPE.VALUE
  )

  $: canDuplicate = selection != null &&
    hasSelectionContents &&
    !rootSelected // must not be root

  $: canExtract = selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.VALUE
  ) &&
    !rootSelected // must not be root

  $: canEditKey =
    selection != null &&
    (
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE ||
      (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)
    ) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(selection.focusPath)))

  $: canEditValue =
    selection != null &&
    (
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE ||
      (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)
    ) &&
    !isObjectOrArray(getIn(json, selection.focusPath))

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
    <button
      title="Edit the key (Double-click on the key)"
      on:click={handleEditKey}
      disabled={!canEditKey}
    >
      <Icon data={faPen} /> Edit key
    </button>
    <button
      title="Edit the value (Double-click on the value)"
      on:click={handleEditValue}
      disabled={!canEditValue}
    >
      <Icon data={faPen} /> Edit value
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button
      title="Cut selected contents (Ctrl+X)"
      on:click={handleCut}
      disabled={!hasSelectionContents}>
      <Icon data={faCut} /> Cut
    </button>
    <button
      title="Copy selected contents (Ctrl+C)"
      on:click={handleCopy}
      disabled={!hasSelectionContents}
    >
      <Icon data={faCopy} /> Copy
    </button>
    <button
      title="Paste clipboard contents (Ctrl+V)"
      on:click={handlePaste}
      disabled={!hasSelection}
    >
      <Icon data={faPaste} /> Paste
    </button>
  </div>
  <div class="separator"></div>
  <div class="row">
    <div class="column">
      <button
        title="Remove selected contents (Delete)"
        on:click={handleRemove}
        disabled={!hasSelectionContents}
      >
        <Icon data={faTimes} /> Remove
      </button>
      <button
        title="Duplicate selected contents (Ctrl+D)"
        on:click={handleDuplicate}
        disabled={!canDuplicate}
      >
        <Icon data={faClone} /> Duplicate
      </button>
      <button
        title="Extract selected contents"
        on:click={handleExtract}
        disabled={!canExtract}
      >
        <Icon data={faCropAlt} /> Extract
      </button>
      <button
        title="Sort array or object contents"
        on:click={handleSort}
        disabled={!hasSelectionContents}
      >
        <Icon data={faSortAmountDownAlt} /> Sort
      </button>
      <button
        title="Transform array or object contents (filter, sort, project)"
        on:click={handleTransform}
        disabled={!hasSelectionContents}
      >
        <Icon data={faFilter} /> Transform
      </button>
    </div>
    <div class="column">
      <div class="label">
        {insertText}:
      </div>
      <button
        on:click={() => handleInsert('structure')}
        title="{insertText} structure"
        disabled={!hasSelection}
      >
        <span class="insert"><span class="plus">{'+'}</span></span> Structure
      </button>
      <button
        on:click={() => handleInsert('object')}
        title="{insertText} object"
        disabled={!hasSelection}
      >
        <span class="insert">{'{}'}</span> Object
      </button>
      <button
        on:click={() => handleInsert('array')}
        title="{insertText} array"
        disabled={!hasSelection}
      >
        <span class="insert">[]</span> Array
      </button>
      <button
        on:click={() => handleInsert('value')}
        title="{insertText} value"
        disabled={!hasSelection}
      >
        <span class="insert"><span class="quote">"</span></span> Value
      </button>
    </div>
  </div>
  <div class="separator"></div>
  <div class="row">
    <button
      title="Select area before current entry to insert or paste contents"
      disabled={!hasSelectionContents || rootSelected}
      on:click={handleInsertBefore}
    >
      <Icon data={faCaretSquareUp} /> Insert before
    </button>
    <button
      title="Select area after current entry to insert or paste contents"
      disabled={!hasSelectionContents || rootSelected}
      on:click={handleInsertAfter}
    >
      <Icon data={faCaretSquareDown} /> Insert after
    </button>
  </div>
</div>

<style src="./ContextMenu.scss"></style>
