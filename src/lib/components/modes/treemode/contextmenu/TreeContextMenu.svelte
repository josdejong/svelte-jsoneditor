<svelte:options immutable={true} />

<script lang="ts">
  import {
    faArrowRightArrowLeft,
    faCaretSquareDown,
    faCaretSquareUp,
    faClone,
    faCopy,
    faCropAlt,
    faCut,
    faFilter,
    faPaste,
    faPen,
    faPlus,
    faSortAmountDownAlt,
    faTrashCan
  } from '@fortawesome/free-solid-svg-icons'
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
  import type {
    ContextMenuItem,
    DocumentState,
    InsertType,
    JSONParser,
    OnRenderContextMenuInternal
  } from '$lib/types'
  import { getEnforceString } from '$lib/logic/documentState.js'
  import ContextMenu from '../../../../components/controls/contextmenu/ContextMenu.svelte'

  export let json: unknown
  export let documentState: DocumentState
  export let parser: JSONParser

  export let showTip: boolean

  export let onCloseContextMenu: () => void
  export let onRenderContextMenu: OnRenderContextMenuInternal
  export let onEditKey: () => void
  export let onEditValue: () => void
  export let onToggleEnforceString: () => void
  export let onCut: (indent: boolean) => void
  export let onCopy: (indent: boolean) => void
  export let onPaste: () => void
  export let onRemove: () => void
  export let onDuplicate: () => void
  export let onExtract: () => void
  export let onInsertBefore: () => void
  export let onInsert: (type: InsertType) => void
  export let onConvert: (type: InsertType) => void
  export let onInsertAfter: () => void
  export let onSort: () => void
  export let onTransform: () => void

  $: selection = documentState.selection

  $: hasJson = json !== undefined
  $: hasSelection = !!selection
  $: rootSelected = selection ? isEmpty(getFocusPath(selection)) : false
  $: focusValue = selection ? getIn(json, getFocusPath(selection)) : undefined
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
    selection != null && focusValue
      ? getEnforceString(
          focusValue,
          documentState.enforceStringMap,
          compileJSONPointer(getFocusPath(selection)),
          parser
        )
      : false

  function handleInsertOrConvert(type: InsertType) {
    if (hasSelectionContents) {
      onConvert(type)
    } else {
      onInsert(type)
    }
  }

  let defaultItems: ContextMenuItem[]
  $: defaultItems = [
    {
      type: 'row',
      items: [
        {
          type: 'button',
          onClick: () => onEditKey(),
          icon: faPen,
          text: 'Edit key',
          title: 'Edit the key (Double-click on the key)',
          disabled: !canEditKey
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onEditValue(),
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
        }
      ]
    },
    { type: 'separator' },
    {
      type: 'row',
      items: [
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
              onClick: () => onCopy(true),
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
        }
      ]
    },
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            {
              type: 'button',
              onClick: () => onDuplicate(),
              icon: faClone,
              text: 'Duplicate',
              title: 'Duplicate selected contents (Ctrl+D)',
              disabled: !canDuplicate
            },
            {
              type: 'button',
              onClick: () => onExtract(),
              icon: faCropAlt,
              text: 'Extract',
              title: 'Extract selected contents',
              disabled: !canExtract
            },
            {
              type: 'button',
              onClick: () => onSort(),
              icon: faSortAmountDownAlt,
              text: 'Sort',
              title: 'Sort array or object contents',
              disabled: !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onTransform(),
              icon: faFilter,
              text: 'Transform',
              title: 'Transform array or object contents (filter, sort, project)',
              disabled: !hasSelectionContents
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
            { type: 'label', text: insertOrConvertText },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('structure'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: 'Structure',
              title: insertOrConvertText + ' structure',
              disabled: !canInsertOrConvertStructure
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('object'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: 'Object',
              title: insertOrConvertText + ' structure',
              disabled: !canInsertOrConvertObject
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('array'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: 'Array',
              title: insertOrConvertText + ' array',
              disabled: !canInsertOrConvertArray
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('value'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: 'Value',
              title: insertOrConvertText + ' value',
              disabled: !canInsertOrConvertValue
            }
          ]
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      type: 'row',
      items: [
        {
          type: 'button',
          onClick: () => onInsertBefore(),
          icon: faCaretSquareUp,
          text: 'Insert before',
          title: 'Select area before current entry to insert or paste contents',
          disabled: !hasSelectionContents || rootSelected
        },
        {
          type: 'button',
          onClick: () => onInsertAfter(),
          icon: faCaretSquareDown,
          text: 'Insert after',
          title: 'Select area after current entry to insert or paste contents',
          disabled: !hasSelectionContents || rootSelected
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
