import {
  faArrowRightArrowLeft,
  faCaretSquareDown,
  faCaretSquareUp,
  faCheckSquare,
  faClone,
  faCopy,
  faCropAlt,
  faCut,
  faFilter,
  faPaste,
  faPen,
  faPlus,
  faSortAmountDownAlt,
  faSquare,
  faTrashCan
} from '@fortawesome/free-solid-svg-icons'
import {
  canConvert,
  getFocusPath,
  isKeySelection,
  isMultiSelection,
  isValueSelection,
  singleItemSelected
} from '$lib/logic/selection'
import type { DocumentState, InsertType, JSONParser } from 'svelte-jsoneditor'
import { initial, isEmpty } from 'lodash-es'
import { compileJSONPointer, getIn } from 'immutable-json-patch'
import { isObjectOrArray, isObject } from '$lib/utils/typeUtils'
import { getEnforceString } from '$lib/logic/documentState'
import type { ContextMenuItem } from 'svelte-jsoneditor'

export default function ({
  json,
  documentState,
  parser,

  onEditKey,
  onEditValue,
  onToggleEnforceString,
  onCut,
  onCopy,
  onPaste,
  onRemove,
  onDuplicate,
  onExtract,
  onInsertBefore,
  onInsert,
  onConvert,
  onInsertAfter,
  onSort,
  onTransform
}: {
  json: unknown
  documentState: DocumentState
  parser: JSONParser

  onEditKey: () => void
  onEditValue: () => void
  onToggleEnforceString: () => void
  onCut: (indent: boolean) => void
  onCopy: (indent: boolean) => void
  onPaste: () => void
  onRemove: () => void
  onDuplicate: () => void
  onExtract: () => void
  onInsertBefore: () => void
  onInsert: (type: InsertType) => void
  onConvert: (type: InsertType) => void
  onInsertAfter: () => void
  onSort: () => void
  onTransform: () => void
}): ContextMenuItem[] {
  const selection = documentState.selection

  const hasJson = json !== undefined
  const hasSelection = !!selection
  const rootSelected = selection ? isEmpty(getFocusPath(selection)) : false
  const focusValue = selection ? getIn(json, getFocusPath(selection)) : undefined
  const editValueText = Array.isArray(focusValue)
    ? 'Edit array'
    : isObject(focusValue)
      ? 'Edit object'
      : 'Edit value'

  const hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  const canDuplicate = hasJson && hasSelectionContents && !rootSelected // must not be root
  const canExtract =
    hasJson &&
    selection != null &&
    (isMultiSelection(selection) || isValueSelection(selection)) &&
    !rootSelected // must not be root

  const canEditKey =
    hasJson &&
    selection != null &&
    singleItemSelected(selection) &&
    !rootSelected &&
    !Array.isArray(getIn(json, initial(getFocusPath(selection))))

  const canEditValue = hasJson && selection != null && singleItemSelected(selection)
  const canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  const convertMode = hasSelectionContents
  const insertOrConvertText = convertMode ? 'Convert to:' : 'Insert:'

  const canInsertOrConvertStructure = convertMode ? false : hasSelection
  const canInsertOrConvertObject = convertMode
    ? canConvert(selection) && !isObject(focusValue)
    : hasSelection
  const canInsertOrConvertArray = convertMode
    ? canConvert(selection) && !Array.isArray(focusValue)
    : hasSelection
  const canInsertOrConvertValue = convertMode
    ? canConvert(selection) && isObjectOrArray(focusValue)
    : hasSelection

  const enforceString =
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

  return [
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
}
