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
  import { onMount } from 'svelte'
  import Icon from 'svelte-awesome'
  import { SELECTION_TYPE } from '../../../../logic/selection.js'
  import { keyComboFromEvent } from '../../../../utils/keyBindings.js'
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

  let refContextMenu

  onMount(() => {
    setTimeout(() => {
      const firstEnabledButton = [...refContextMenu.querySelectorAll('button')]
        .find(button => !button.disabled)

      if (firstEnabledButton) {
        firstEnabledButton.focus()
      }
    })
  })

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: rootSelected = hasSelection && isEmpty(selection.focusPath)

  $: hasSelectionContents = hasJson &&
    selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
    selection.type === SELECTION_TYPE.KEY ||
    selection.type === SELECTION_TYPE.VALUE
  )

  $: canDuplicate = hasJson &&
    hasSelectionContents &&
    !rootSelected // must not be root

  $: canExtract = hasJson &&
    selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.VALUE
  ) &&
    !rootSelected // must not be root

  $: canEditKey =
    hasJson &&
    selection != null &&
    (
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE ||
      (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)
    ) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(selection.focusPath)))

  $: canEditValue =
    hasJson &&
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

  function handleKeyDown (event) {
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    /**
     * Find first enabled sibling button.
     * Uses hints from the button attributes itself: data-name, data-up,
     * data-down, data-left, data-right.
     * @param {Element} currentButton
     * @param {'left' | 'right' | 'up' | 'down'} direction
     */
    function findNextButton (currentButton, direction) {
      const optionsString = currentButton.getAttribute('data-' + direction)
      if (optionsString) {
        const options = optionsString.split(',')

        // Step 1: find exact match
        for (const option of options) {
          const match = refContextMenu.querySelector(`button[data-name="${option}"]`)
          if (match && !match.disabled) {
            return match
          }
        }

        // Step 2: recurse over multiple buttons to find an enabled one
        for (const option of options) {
          const match = refContextMenu.querySelector(`button[data-name="${option}"]`)
          if (match && match.disabled) {
            const match2 = findNextButton(match, direction)
            if (match2) {
              return match2
            }
          }
        }
      }
    }

    function focusNextButton (currentButton, direction) {
      const next = findNextButton(currentButton, direction)
      if (next) {
        next.focus()
      }
    }

    if (combo === 'Up' || combo === 'Down' || combo === 'Left' || combo === 'Right') {
      event.preventDefault()
      focusNextButton(event.target, combo.toLowerCase())
    }
  }

</script>

<div
  class="jsoneditor-contextmenu"
  bind:this={refContextMenu}
  on:keydown={handleKeyDown}
>
  <div class="row">
    <button
      title="Edit the key (Double-click on the key)"
      data-name="edit-key"
      data-down="cut,copy,paste"
      data-right="edit-value"
      on:click={handleEditKey}
      disabled={!canEditKey}
    >
      <Icon data={faPen} /> Edit key
    </button>
    <button
      title="Edit the value (Double-click on the value)"
      data-name="edit-value"
      data-down="paste,copy,cut"
      data-left="edit-key"
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
      data-name="cut"
      data-up="edit-key,edit-value"
      data-down="remove"
      data-right="copy"
      on:click={handleCut}
      disabled={!hasSelectionContents}>
      <Icon data={faCut} /> Cut
    </button>
    <button
      title="Copy selected contents (Ctrl+C)"
      data-name="copy"
      data-up="edit-key,edit-value"
      data-down="insert-structure"
      data-left="cut"
      data-right="paste"
      on:click={handleCopy}
      disabled={!hasSelectionContents}
    >
      <Icon data={faCopy} /> Copy
    </button>
    <button
      title="Paste clipboard contents (Ctrl+V)"
      data-name="paste"
      data-up="edit-value,edit-key"
      data-down="insert-structure"
      data-left="copy"
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
        data-name="remove"
        data-up="cut,copy,paste"
        data-down="duplicate"
        data-right="insert-structure"
        on:click={handleRemove}
        disabled={!hasSelectionContents}
      >
        <Icon data={faTimes} /> Remove
      </button>
      <button
        title="Duplicate selected contents (Ctrl+D)"
        data-name="duplicate"
        data-up="remove"
        data-down="extract"
        data-right="insert-structure"
        on:click={handleDuplicate}
        disabled={!canDuplicate}
      >
        <Icon data={faClone} /> Duplicate
      </button>
      <button
        title="Extract selected contents"
        data-name="extract"
        data-up="duplicate"
        data-down="sort"
        data-right="insert-object"
        on:click={handleExtract}
        disabled={!canExtract}
      >
        <Icon data={faCropAlt} /> Extract
      </button>
      <button
        title="Sort array or object contents"
        data-name="sort"
        data-up="extract"
        data-down="transform"
        data-right="insert-array"
        on:click={handleSort}
        disabled={!hasSelectionContents}
      >
        <Icon data={faSortAmountDownAlt} /> Sort
      </button>
      <button
        title="Transform array or object contents (filter, sort, project)"
        data-name="transform"
        data-up="sort"
        data-down="insert-before"
        data-right="insert-value"
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
        data-name="insert-structure"
        data-up="paste,copy,cut"
        data-down="insert-object"
        data-left="duplicate"
        disabled={!hasSelection}
      >
        <span class="insert"><span class="plus">{'+'}</span></span> Structure
      </button>
      <button
        on:click={() => handleInsert('object')}
        title="{insertText} object"
        data-name="insert-object"
        data-up="insert-structure"
        data-down="insert-array"
        data-left="extract"
        disabled={!hasSelection}
      >
        <span class="insert">{'{}'}</span> Object
      </button>
      <button
        on:click={() => handleInsert('array')}
        title="{insertText} array"
        data-name="insert-array"
        data-up="insert-object"
        data-down="insert-value"
        data-left="sort"
        disabled={!hasSelection}
      >
        <span class="insert">[]</span> Array
      </button>
      <button
        on:click={() => handleInsert('value')}
        title="{insertText} value"
        data-name="insert-value"
        data-up="insert-array"
        data-down="insert-after"
        data-left="transform"
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
      data-name="insert-before"
      data-up="transform"
      data-right="insert-after"
      disabled={!hasSelectionContents || rootSelected}
      on:click={handleInsertBefore}
    >
      <Icon data={faCaretSquareUp} /> Insert before
    </button>
    <button
      title="Select area after current entry to insert or paste contents"
      data-name="insert-after"
      data-up="insert-value"
      data-left="insert-before"
      disabled={!hasSelectionContents || rootSelected}
      on:click={handleInsertAfter}
    >
      <Icon data={faCaretSquareDown} /> Insert after
    </button>
  </div>
</div>

<style src="./ContextMenu.scss"></style>
