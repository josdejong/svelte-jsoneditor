<svelte:options immutable={true} />

<script lang="ts">
  import { faCopy, faCut, faPaste, faPen, faTimes } from '@fortawesome/free-solid-svg-icons'
  import type { JSONValue } from 'immutable-json-patch'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { initial, isEmpty } from 'lodash-es'
  import {
    canConvert,
    isKeySelection,
    isMultiSelection,
    isValueSelection,
    singleItemSelected
  } from '$lib/logic/selection'
  import { isObject, isObjectOrArray } from '$lib/utils/typeUtils'
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import type { ContextMenuItem, DocumentState, JSONParser } from '$lib/types'
  import { getEnforceString } from '$lib/logic/documentState'
  import ContextMenu from '$lib/components/controls/contextmenu/ContextMenu.svelte'

  export let json: JSONValue
  export let documentState: DocumentState
  export let parser: JSONParser

  export let showTip

  export let onCloseContextMenu
  export let onEditValue
  export let onToggleEnforceString
  export let onCut
  export let onCopy
  export let onPaste
  export let onRemove

  $: selection = documentState.selection

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: rootSelected = hasSelection && isEmpty(selection.focusPath)
  $: focusValue = hasSelection ? getIn(json, selection.focusPath) : undefined
  $: editValueText = Array.isArray(focusValue)
    ? 'Edit array'
    : isObject(focusValue)
    ? 'Edit object'
    : 'Edit value'

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

  $: canEditValue = hasJson && selection != null && singleItemSelected(selection)
  $: canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  $: convertMode = hasSelectionContents
  $: insertOrConvertText = convertMode ? 'Convert to:' : 'Insert:'
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
          compileJSONPointer(selection.focusPath),
          parser
        )
      : false

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

  let items: ContextMenuItem[]
  $: items = [
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: handleEditValue,
                icon: faPen,
                text: editValueText,
                title: 'Edit the value (Double-click on the value)',
                disabled: !canEditValue
              },
              width: '11em',
              items: [
                {
                  type: 'button',
                  icon: faPen,
                  text: editValueText,
                  title: 'Edit the value (Double-click on the value)',
                  onClick: handleEditValue,
                  disabled: !canEditValue
                },
                {
                  type: 'button',
                  icon: enforceString ? faCheckSquare : faSquare,
                  text: 'Enforce string',
                  title: 'Enforce keeping the value as string when it contains a numeric value',
                  onClick: handleToggleEnforceString,
                  disabled: !canEnforceString
                }
              ]
            },
            { type: 'separator' },

            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: handleCut,
                icon: faCut,
                text: 'Cut',
                title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
                disabled: !hasSelectionContents
              },
              width: '10em',
              items: [
                {
                  type: 'button',
                  icon: faCut,
                  text: 'Cut formatted',
                  title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
                  onClick: handleCut,
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCut,
                  text: 'Cut compacted',
                  title: 'Cut selected contents, without indentation (Ctrl+Shift+X)',
                  onClick: handleCutCompact,
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: handleCopy,
                icon: faCopy,
                text: 'Copy',
                title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
                disabled: !hasSelectionContents
              },
              width: '12em',
              items: [
                {
                  type: 'button',
                  icon: faCopy,
                  text: 'Copy formatted',
                  title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
                  onClick: handleCopy,
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCopy,
                  text: 'Copy compacted',
                  title: 'Copy selected contents, without indentation (Ctrl+Shift+C)',
                  onClick: handleCopyCompact,
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'button',
              onClick: handlePaste,
              icon: faPaste,
              text: 'Paste',
              title: 'Paste clipboard contents (Ctrl+V)',
              disabled: !hasSelection
            },
            { type: 'separator' },
            {
              type: 'button',
              onClick: handleRemove,
              icon: faTimes,
              text: 'Remove',
              title: 'Remove selected contents (Delete)',
              disabled: !hasSelectionContents
            }
          ]
        }
      ]
    }
  ]
</script>

<ContextMenu
  {items}
  tip={showTip ? 'Tip: you can open this context menu via right-click or with Ctrl+Q' : undefined}
/>
