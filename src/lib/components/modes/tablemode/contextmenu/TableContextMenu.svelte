<svelte:options immutable={true} />

<script lang="ts">
  import {
    faClone,
    faCopy,
    faCut,
    faPaste,
    faPen,
    faPlus,
    faTrashCan
  } from '@fortawesome/free-solid-svg-icons'
  import type { JSONValue } from 'immutable-json-patch'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { initial, isEmpty } from 'lodash-es'
  import {
    canConvert,
    getFocusPath,
    isKeySelection,
    isMultiSelection,
    isValueSelection,
    singleItemSelected
  } from '$lib/logic/selection.js'
  import { isObject, isObjectOrArray } from '$lib/utils/typeUtils.js'
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import type { ContextMenuItem, DocumentState, JSONParser } from '$lib/types'
  import { getEnforceString } from '$lib/logic/documentState.js'
  import ContextMenu from '../../../../components/controls/contextmenu/ContextMenu.svelte'

  export let json: JSONValue | undefined
  export let documentState: DocumentState
  export let parser: JSONParser

  export let showTip: boolean

  export let onCloseContextMenu: () => void
  export let onEditValue: () => void
  export let onEditRow: () => void
  export let onToggleEnforceString: () => void
  export let onCut: (indent: boolean) => void
  export let onCopy: (indent: boolean) => void
  export let onPaste: () => void
  export let onRemove: () => void
  export let onDuplicateRow: () => void
  export let onInsertBeforeRow: () => void
  export let onInsertAfterRow: () => void
  export let onRemoveRow: () => void

  $: selection = documentState.selection

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: rootSelected = selection != null && isEmpty(getFocusPath(selection))
  $: focusValue =
    json !== undefined && selection != null ? getIn(json, getFocusPath(selection)) : undefined

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
    json !== undefined &&
    selection != null &&
    singleItemSelected(selection) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(getFocusPath(selection))))

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
          compileJSONPointer(getFocusPath(selection)),
          parser
        )
      : false

  function handleEditValue() {
    onCloseContextMenu()
    onEditValue()
  }

  function handleEditRow() {
    onCloseContextMenu()
    onEditRow()
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

  function handleDuplicateRow() {
    onCloseContextMenu()
    onDuplicateRow()
  }

  function handleInsertBeforeRow() {
    onCloseContextMenu()
    onInsertBeforeRow()
  }

  function handleInsertAfterRow() {
    onCloseContextMenu()
    onInsertAfterRow()
  }

  function handleRemoveRow() {
    onCloseContextMenu()
    onRemoveRow()
  }

  let items: ContextMenuItem[]
  $: items = [
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            { type: 'label', text: 'Table cell:' },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: handleEditValue,
                icon: faPen,
                text: 'Edit',
                title: 'Edit the value (Double-click on the value)',
                disabled: !canEditValue
              },
              width: '11em',
              items: [
                {
                  type: 'button',
                  icon: faPen,
                  text: 'Edit',
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
            {
              type: 'button',
              onClick: handleRemove,
              icon: faTrashCan,
              text: 'Remove',
              title: 'Remove selected contents (Delete)',
              disabled: !hasSelectionContents
            }
          ]
        },
        {
          type: 'column',
          items: [
            { type: 'label', text: 'Table row:' },
            {
              type: 'button',
              onClick: handleEditRow,
              icon: faPen,
              text: 'Edit row',
              title: 'Edit the current row',
              disabled: !hasSelectionContents
            },
            {
              type: 'button',
              onClick: handleDuplicateRow,
              icon: faClone,
              text: 'Duplicate row',
              title: 'Duplicate the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: handleInsertBeforeRow,
              icon: faPlus,
              text: 'Insert before',
              title: 'Insert a row before the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: handleInsertAfterRow,
              icon: faPlus,
              text: 'Insert after',
              title: 'Insert a row after the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: handleRemoveRow,
              icon: faTrashCan,
              text: 'Remove row',
              title: 'Remove current row',
              disabled: !hasSelection
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
