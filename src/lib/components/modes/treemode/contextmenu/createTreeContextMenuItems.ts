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
  isAfterSelection,
  isInsideSelection,
  isKeySelection,
  isMultiSelection,
  isValueSelection,
  singleItemSelected
} from '$lib/logic/selection'
import type {
  ConvertType,
  DocumentState,
  InsertType,
  JSONSelection,
  ContextMenuItem
} from '$lib/types'
import { tString } from '$lib/i18n'
import { initial, isEmpty } from 'lodash-es'
import { getIn } from 'immutable-json-patch'
import { isObject, isObjectOrArray } from '$lib/utils/typeUtils'
import { getEnforceString } from '$lib/logic/documentState'

export default function ({
  json,
  documentState,
  selection,
  readOnly,
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
  documentState: DocumentState | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
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
  onConvert: (type: ConvertType) => void
  onInsertAfter: () => void
  onSort: () => void
  onTransform: () => void
}): ContextMenuItem[] {
  const hasJson = json !== undefined
  const hasSelection = !!selection
  const rootSelected = selection ? isEmpty(getFocusPath(selection)) : false
  const focusValue = selection ? getIn(json, getFocusPath(selection)) : undefined
  const editValueText = Array.isArray(focusValue)
    ? tString('editArray')
    : isObject(focusValue)
      ? tString('editObject')
      : tString('editValue')

  const hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  const parent =
    selection && !rootSelected ? getIn(json, initial(getFocusPath(selection))) : undefined

  const canEditKey =
    !readOnly && hasJson && singleItemSelected(selection) && !rootSelected && !Array.isArray(parent)

  const canEditValue =
    !readOnly && hasJson && selection !== undefined && singleItemSelected(selection)
  const canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  const canCut = !readOnly && hasSelectionContents
  const canCopy = hasSelectionContents
  const canPaste = !readOnly && hasSelection
  const canDuplicate = !readOnly && hasJson && hasSelectionContents && !rootSelected // must not be root
  const canExtract =
    !readOnly &&
    hasJson &&
    selection !== undefined &&
    (isMultiSelection(selection) || isValueSelection(selection)) &&
    !rootSelected // must not be root

  const convertMode = hasSelectionContents
  const insertOrConvertText = convertMode ? `${tString('convertTo')}:` : `${tString('insert')}:`

  const canInsertOrConvertStructure =
    !readOnly &&
    ((isInsideSelection(selection) && Array.isArray(focusValue)) ||
      (isAfterSelection(selection) && Array.isArray(parent)))
  const canInsertOrConvertObject =
    !readOnly && (convertMode ? canConvert(selection) && !isObject(focusValue) : hasSelection)
  const canInsertOrConvertArray =
    !readOnly && (convertMode ? canConvert(selection) && !Array.isArray(focusValue) : hasSelection)
  const canInsertOrConvertValue =
    !readOnly && (convertMode ? canConvert(selection) && isObjectOrArray(focusValue) : hasSelection)

  const enforceString =
    selection !== undefined ? getEnforceString(json, documentState, getFocusPath(selection)) : false

  function handleInsertOrConvert(type: InsertType) {
    if (hasSelectionContents) {
      if (type !== 'structure') {
        onConvert(type)
      }
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
          text: tString('editKey'),
          title: `${tString('editTheKey')} (Double-click on the key)`,
          disabled: !canEditKey
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onEditValue(),
            icon: faPen,
            text: editValueText,
            title: `${tString('editValue')} (Double-click on the value)`,
            disabled: !canEditValue
          },
          width: '11em',
          items: [
            {
              type: 'button',
              icon: faPen,
              text: editValueText,
              title: `${tString('editValue')} (Double-click on the value)`,
              onClick: () => onEditValue(),
              disabled: !canEditValue
            },
            {
              type: 'button',
              icon: enforceString ? faCheckSquare : faSquare,
              text: tString('enforceString'),
              title: tString('enforceKeepingTheValue'),
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
            text: tString('cut'),
            title: `${tString('cutFormattedTitle')} (Ctrl+X)`,
            disabled: !canCut
          },
          width: '10em',
          items: [
            {
              type: 'button',
              icon: faCut,
              text: tString('cutFormatted'),
              title: `${tString('cutFormattedTitle')} (Ctrl+X)`,
              onClick: () => onCut(true),
              disabled: !canCut
            },
            {
              type: 'button',
              icon: faCut,
              text: tString('copyCompacted'),
              title: `${tString('cutCompactedTitle')} (Ctrl+Shift+X)`,
              onClick: () => onCut(false),
              disabled: !canCut
            }
          ]
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onCopy(true),
            icon: faCopy,
            text: tString('copy'),
            title: `${tString('copyWithIndent')} (Ctrl+C)`,
            disabled: !canCopy
          },
          width: '12em',
          items: [
            {
              type: 'button',
              icon: faCopy,
              text: tString('copyCompacted'),
              title: `${tString('copyWithIndent')} (Ctrl+C)`,
              onClick: () => onCopy(true),
              disabled: !canCopy
            },
            {
              type: 'button',
              icon: faCopy,
              text: tString('copyCompacted'),
              title: `${tString('copyWithoutIndent')} (Ctrl+Shift+C)`,
              onClick: () => onCopy(false),
              disabled: !canCopy
            }
          ]
        },
        {
          type: 'button',
          onClick: () => onPaste(),
          icon: faPaste,
          text: tString('paste'),
          title: `${tString('pasteTitle')} (Ctrl+V)`,
          disabled: !canPaste
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
              text: tString('duplicate'),
              title: tString('duplicateSelectedContents') + '(Ctrl+D)',
              disabled: !canDuplicate
            },
            {
              type: 'button',
              onClick: () => onExtract(),
              icon: faCropAlt,
              text: tString('Extract'),
              title: tString('extractSelectedContent'),
              disabled: !canExtract
            },
            {
              type: 'button',
              onClick: () => onSort(),
              icon: faSortAmountDownAlt,
              text: tString('sort'),
              title: tString('sortArrayOrObject'),
              disabled: readOnly || !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onTransform(),
              icon: faFilter,
              text: tString('transform'),
              title: tString('transformArrayOrObject'),
              disabled: readOnly || !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onRemove(),
              icon: faTrashCan,
              text: tString('remove'),
              title: `${tString('removeSelected')} (Delete)`,
              disabled: readOnly || !hasSelectionContents
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
              text: tString('structure'),
              title: insertOrConvertText + tString('structureTitle'),
              disabled: !canInsertOrConvertStructure
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('object'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: tString('object'),
              title: insertOrConvertText + ` ${tString('object').toLowerCase()}`,
              disabled: !canInsertOrConvertObject
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('array'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: tString('array'),
              title: insertOrConvertText + ` ${tString('array').toLowerCase()}`,
              disabled: !canInsertOrConvertArray
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('value'),
              icon: convertMode ? faArrowRightArrowLeft : faPlus,
              text: tString('value'),
              title: insertOrConvertText + ` ${tString('value').toLowerCase()}`,
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
          text: tString('insertBefore'),
          title: tString('selectAreaBeforeCurrentEntry'),
          disabled: readOnly || !hasSelectionContents || rootSelected
        },
        {
          type: 'button',
          onClick: () => onInsertAfter(),
          icon: faCaretSquareDown,
          text: tString('insertAfter'),
          title: tString('selectAreaAfterCurrentEntry'),
          disabled: readOnly || !hasSelectionContents || rootSelected
        }
      ]
    }
  ]
}
