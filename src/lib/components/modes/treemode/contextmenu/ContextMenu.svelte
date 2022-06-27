<svelte:options immutable={true} />

<script lang="ts">
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
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { initial, isEmpty } from 'lodash-es'
  import { onMount } from 'svelte'
  import Icon from 'svelte-awesome'
  import DropdownButton from '../../../controls/DropdownButton.svelte'
  import { canConvert, singleItemSelected } from '$lib/logic/selection'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { isObject, isObjectOrArray } from '$lib/utils/typeUtils'
  import { faCheckSquare, faLightbulb, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { findNearestElement } from '$lib/utils/domUtils'
  import type { DocumentState, JSONData } from '../../../../types'
  import { isKeySelection, isMultiSelection, isValueSelection } from '../../../../logic/selection'
  import { getEnforceString } from '../../../../logic/documentState'

  export let json: JSONData
  export let documentState: DocumentState

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

  $: selection = documentState.selection

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: rootSelected = hasSelection && isEmpty(selection.focusPath)
  $: focusValue = hasSelection ? getIn(json, selection.focusPath) : undefined

  $: hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  $: canDuplicate = hasJson && hasSelectionContents && !rootSelected // must not be root

  $: canExtract =
    hasJson &&
    selection != null &&
    (isMultiSelection(selection) || isValueSelection(selection)) &&
    !rootSelected // must not be root

  $: canEditKey =
    hasJson &&
    selection != null &&
    singleItemSelected(selection) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(selection.focusPath)))

  $: canEditValue =
    hasJson && selection != null && singleItemSelected(selection) && !isObjectOrArray(focusValue)

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
      ? getEnforceString(
          focusValue,
          documentState.enforceStringMap,
          compileJSONPointer(selection.focusPath)
        )
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

    if (combo === 'Up' || combo === 'Down' || combo === 'Left' || combo === 'Right') {
      event.preventDefault()

      const buttons: HTMLButtonElement[] = Array.from(
        refContextMenu.querySelectorAll('button:not([disabled])')
      )
      const nearest = findNearestElement({
        allElements: buttons,
        currentElement: event.target,
        direction: combo,
        hasPrio: (element: HTMLButtonElement) => {
          return element.getAttribute('data-type') !== 'jse-open-dropdown'
        }
      })
      if (nearest) {
        nearest.focus()
      }
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
        on:click={handleCopy}
        disabled={!hasSelectionContents}
      >
        <Icon data={faCopy} /> Copy
      </button>
    </DropdownButton>
    <button
      type="button"
      title="Paste clipboard contents (Ctrl+V)"
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
        on:click={handleRemove}
        disabled={!hasSelectionContents}
      >
        <Icon data={faTimes} /> Remove
      </button>
      <button
        type="button"
        title="Duplicate selected contents (Ctrl+D)"
        on:click={handleDuplicate}
        disabled={!canDuplicate}
      >
        <Icon data={faClone} /> Duplicate
      </button>
      <button
        type="button"
        title="Extract selected contents"
        on:click={handleExtract}
        disabled={!canExtract}
      >
        <Icon data={faCropAlt} /> Extract
      </button>
      <button
        type="button"
        title="Sort array or object contents"
        on:click={handleSort}
        disabled={!hasSelectionContents}
      >
        <Icon data={faSortAmountDownAlt} /> Sort
      </button>
      <button
        type="button"
        title="Transform array or object contents (filter, sort, project)"
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
        disabled={!canInsertOrConvertStructure}
      >
        <span class="jse-insert"><span class="jse-plus">{'+'}</span></span> Structure
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('object')}
        title="{insertOrConvertText} object"
        disabled={!canInsertOrConvertObject}
      >
        <span class="jse-insert">{'{}'}</span> Object
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('array')}
        title="{insertOrConvertText} array"
        disabled={!canInsertOrConvertArray}
      >
        <span class="jse-insert">[]</span> Array
      </button>
      <button
        type="button"
        on:click={() => handleInsertOrConvert('value')}
        title="{insertOrConvertText} value"
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
      disabled={!hasSelectionContents || rootSelected}
      on:click={handleInsertBefore}
    >
      <Icon data={faCaretSquareUp} /> Insert before
    </button>
    <button
      type="button"
      title="Select area after current entry to insert or paste contents"
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
