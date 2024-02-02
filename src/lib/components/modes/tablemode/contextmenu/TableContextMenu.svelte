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
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import {
    getFocusPath,
    isKeySelection,
    isMultiSelection,
    isValueSelection,
    singleItemSelected
  } from '$lib/logic/selection.js'
  import { isObjectOrArray } from '$lib/utils/typeUtils.js'
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import type {
    ContextMenuItem,
    DocumentState,
    JSONParser,
    OnRenderContextMenuInternal
  } from '$lib/types'
  import { getEnforceString } from '$lib/logic/documentState.js'
  import ContextMenu from '../../../../components/controls/contextmenu/ContextMenu.svelte'

  export let json: unknown | undefined
  export let documentState: DocumentState
  export let parser: JSONParser

  export let showTip: boolean

  export let onCloseContextMenu: () => void
  export let onRenderContextMenu: OnRenderContextMenuInternal
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
  $: hasSelection = !!selection
  $: focusValue = json !== undefined && selection ? getIn(json, getFocusPath(selection)) : undefined

  $: hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  $: canEditValue = hasJson && selection != null && singleItemSelected(selection)
  $: canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  $: enforceString =
    selection != null && focusValue !== undefined
      ? getEnforceString(
          focusValue,
          documentState.enforceStringMap,
          compileJSONPointer(getFocusPath(selection)),
          parser
        )
      : false

  let defaultItems: ContextMenuItem[]
  $: defaultItems = [
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
                onClick: () => onEditValue(),
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
                  onClick: () => onEditValue(),
                  disabled: !canEditValue
                },
                {
                  type: 'button',
                  icon: enforceString ? faCheckSquare : faSquare,
                  text: 'Enforce string',
                  title: 'Enforce keeping the value as string when it contains a numeric value',
                  onClick: () => onToggleEnforceString(),
                  disabled: !canEnforceString
                }
              ]
            },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: () => onCut(true),
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
                  onClick: () => onCut(true),
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCut,
                  text: 'Cut compacted',
                  title: 'Cut selected contents, without indentation (Ctrl+Shift+X)',
                  onClick: () => onCut(false),
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: () => onCopy(true),
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
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCopy,
                  text: 'Copy compacted',
                  title: 'Copy selected contents, without indentation (Ctrl+Shift+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'button',
              onClick: () => onPaste(),
              icon: faPaste,
              text: 'Paste',
              title: 'Paste clipboard contents (Ctrl+V)',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: () => onRemove(),
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
              onClick: () => onEditRow(),
              icon: faPen,
              text: 'Edit row',
              title: 'Edit the current row',
              disabled: !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onDuplicateRow(),
              icon: faClone,
              text: 'Duplicate row',
              title: 'Duplicate the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: () => onInsertBeforeRow(),
              icon: faPlus,
              text: 'Insert before',
              title: 'Insert a row before the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: () => onInsertAfterRow(),
              icon: faPlus,
              text: 'Insert after',
              title: 'Insert a row after the current row',
              disabled: !hasSelection
            },
            {
              type: 'button',
              onClick: () => onRemoveRow(),
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

  $: items = onRenderContextMenu(defaultItems)
</script>

<ContextMenu
  {items}
  {onCloseContextMenu}
  tip={showTip ? 'Tip: you can open this context menu via right-click or with Ctrl+Q' : undefined}
/>
