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
  import DropdownButton from '../../../../components/controls/DropdownButton.svelte'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { isObjectOrArray } from '$lib/utils/typeUtils'
  import { faCheckSquare, faLightbulb, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { STATE_ENFORCE_STRING } from '$lib/constants'
  import { isObject } from '../../../../utils/typeUtils.js'
  import { canConvert } from '../../../../logic/selection.js'

  export let json
  export let state
  export let selection

  export let showTip

  export let onCloseContextMenu
  export let onEditKey
  export let onEditValue
  export let onToggleEnforceString
  export let onCut
  export let onCopy
  export let onPaste
  export let onRemove
  export let onDuplicate
  export let onExtract
  export let onInsertBefore
  export let onInsert
  export let onConvert
  export let onInsertAfter
  export let onSort
  export let onTransform

  let refContextMenu

  onMount(() => {
    setTimeout(() => {
      const firstEnabledButton = [...refContextMenu.querySelectorAll('button')].find(
        (button) => !button.disabled
      )

      if (firstEnabledButton) {
        firstEnabledButton.focus()
      }
    })
  })

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: rootSelected = hasSelection && isEmpty(selection.focusPath)
  $: focusValue = hasSelection ? getIn(json, selection.focusPath) : undefined

  $: hasSelectionContents =
    hasJson &&
    selection != null &&
    (selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE)

  $: canDuplicate = hasJson && hasSelectionContents && !rootSelected // must not be root

  $: canExtract =
    hasJson &&
    selection != null &&
    (selection.type === SELECTION_TYPE.MULTI || selection.type === SELECTION_TYPE.VALUE) &&
    !rootSelected // must not be root

  $: canEditKey =
    hasJson &&
    selection != null &&
    (selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE ||
      (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(selection.focusPath)))

  $: canEditValue =
    hasJson &&
    selection != null &&
    (selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE ||
      (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1)) &&
    !isObjectOrArray(focusValue)

  $: convertMode = hasSelectionContents
  $: insertOrConvertText = convertMode ? 'Convert to' : 'Insert'
  $: canInsertOrConvertStructure = convertMode ? false : hasSelection
  $: canInsertOrConvertObject = convertMode
    ? canConvert(selection) && !isObject(focusValue)
    : hasSelection
  $: canInsertOrConvertArray = convertMode
    ? canConvert(selection) && !Array.isArray(focusValue)
    : hasSelection
  $: canInsertOrConvertValue = convertMode
    ? canConvert(selection) && isObjectOrArray(focusValue)
    : hasSelection

  $: enforceString =
    selection != null
      ? getIn(state, selection.focusPath.concat(STATE_ENFORCE_STRING)) === true
      : false

  function handleEditKey() {
    onCloseContextMenu()
    onEditKey()
  }

  function handleEditValue() {
    onCloseContextMenu()
    onEditValue()
  }

  function handleToggleEnforceString() {
    onCloseContextMenu()
    onToggleEnforceString()
  }

  function handleCut() {
    onCloseContextMenu()
    onCut(true)
  }

  function handleCutCompact() {
    onCloseContextMenu()
    onCut(false)
  }

  function handleCopy() {
    onCloseContextMenu()
    onCopy(true)
  }

  function handleCopyCompact() {
    onCloseContextMenu()
    onCopy(false)
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

  function handleInsertOrConvert(type) {
    onCloseContextMenu()

    if (hasSelectionContents) {
      onConvert(type)
    } else {
      onInsert(type)
    }
  }

  function handleSort() {
    onCloseContextMenu()
    onSort()
  }

  function handleTransform() {
    onCloseContextMenu()
    onTransform()
  }

  function handleInsertBefore() {
    onCloseContextMenu()
    onInsertBefore()
  }

  function handleInsertAfter() {
    onCloseContextMenu()
    onInsertAfter()
  }

  function handleKeyDown(event) {
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    /**
     * Find first enabled sibling button.
     * Uses hints from the button attributes itself: data-name, data-up,
     * data-down, data-left, data-right.
     * @param {Element} currentButton
     * @param {'left' | 'right' | 'up' | 'down'} direction
     */
    function findNextButton(currentButton, direction) {
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

    function focusNextButton(currentButton, direction) {
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

  $: editValueDropdownItems = [
    {
      icon: faPen,
      text: 'Edit value',
      title: 'Edit the value (Double-click on the value)',
      onClick: handleEditValue,
      disabled: !canEditValue
    },
    {
      icon: enforceString ? faCheckSquare : faSquare,
      text: 'Enforce string',
      title: 'Enforce keeping the value as string when it contains a numeric value',
      onClick: handleToggleEnforceString,
      disabled: !canEditValue
    }
  ]

  $: cutDropdownItems = [
    {
      icon: faCut,
      text: 'Cut formatted',
      title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
      onClick: handleCut,
      disabled: !hasSelectionContents
    },
    {
      icon: faCut,
      text: 'Cut compacted',
      title: 'Cut selected contents, without indentation (Ctrl+Shift+X)',
      onClick: handleCutCompact,
      disabled: !hasSelectionContents
    }
  ]

  $: copyDropdownItems = [
    {
      icon: faCopy,
      text: 'Copy formatted',
      title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
      onClick: handleCopy,
      disabled: !hasSelectionContents
    },
    {
      icon: faCopy,
      text: 'Copy compacted',
      title: 'Copy selected contents, without indentation (Ctrl+Shift+C)',
      onClick: handleCopyCompact,
      disabled: !hasSelectionContents
    }
  ]
</script>

<div class="jse-contextmenu" bind:this={refContextMenu} on:keydown={handleKeyDown}>
  <div class="jse-row">
    <button
      type="button"
      title="Edit the key (Double-click on the key)"
      data-name="edit-key"
      data-down="cut,copy,paste"
      data-right="edit-value"
      on:click={handleEditKey}
      disabled={!canEditKey}
    >
      <Icon data={faPen} /> Edit key
    </button>
    <DropdownButton width="11em" items={editValueDropdownItems}>
      <button
        type="button"
        slot="defaultItem"
        title="Edit the value (Double-click on the value)"
        data-name="edit-value"
        data-down="paste,copy,cut"
        data-left="edit-key"
        on:click={handleEditValue}
        disabled={!canEditValue}
      >
        <Icon data={faPen} /> Edit value
      </button>
    </DropdownButton>
  </div>
  <div class="jse-separator" />
  <div class="jse-row">
    <DropdownButton width="10em" items={cutDropdownItems}>
      <button
        type="button"
        slot="defaultItem"
        title="Cut selected contents, formatted with indentation (Ctrl+X)"
        data-name="cut"
        data-up="edit-key,edit-value"
        data-down="remove"
        data-right="copy"
        on:click={handleCut}
        disabled={!hasSelectionContents}
      >
        <Icon data={faCut} /> Cut
      </button>
    </DropdownButton>
    <DropdownButton width="12em" items={copyDropdownItems}>
      <button
        type="button"
        slot="defaultItem"
        title="Copy selected contents, formatted with indentation (Ctrl+C)"
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
    </DropdownButton>
    <button
      type="button"
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
  <div class="jse-separator" />
  <div class="jse-row">
    <div class="jse-column">
      <button
        type="button"
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
        type="button"
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
        type="button"
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
        type="button"
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
        type="button"
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
    <div class="jse-column">
      <div class="jse-label">
        {insertOrConvertText}:
      </div>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('structure')}
        title="{insertOrConvertText} structure"
        data-name="insert-structure"
        data-up="paste,copy,cut"
        data-down="insert-object"
        data-left="duplicate"
        disabled={!canInsertOrConvertStructure}
      >
        <span class="jse-insert"><span class="jse-plus">{'+'}</span></span> Structure
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('object')}
        title="{insertOrConvertText} object"
        data-name="insert-object"
        data-up="insert-structure"
        data-down="insert-array"
        data-left="extract"
        disabled={!canInsertOrConvertObject}
      >
        <span class="jse-insert">{'{}'}</span> Object
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('array')}
        title="{insertOrConvertText} array"
        data-name="insert-array"
        data-up="insert-object"
        data-down="insert-value"
        data-left="sort"
        disabled={!canInsertOrConvertArray}
      >
        <span class="jse-insert">[]</span> Array
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('value')}
        title="{insertOrConvertText} value"
        data-name="insert-value"
        data-up="insert-array"
        data-down="insert-after"
        data-left="transform"
        disabled={!canInsertOrConvertValue}
      >
        <span class="jse-insert"><span class="jse-quote">"</span></span> Value
      </button>
    </div>
  </div>
  <div class="jse-separator" />
  <div class="jse-row">
    <button
      type="button"
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
      type="button"
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
  {#if showTip}
    <div class="jse-row">
      <div class="jse-tip">
        <div>
          <Icon data={faLightbulb} />
        </div>
        <div>Tip: you can open this context menu via right-click or with Ctrl+Q</div>
      </div>
    </div>
  {/if}
</div>

<style src="./ContextMenu.scss"></style>
