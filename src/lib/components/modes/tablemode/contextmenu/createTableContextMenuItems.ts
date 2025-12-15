import type { ContextMenuItem, DocumentState, JSONSelection } from 'svelte-jsoneditor'
import {
  faCheckSquare,
  faClone,
  faCopy,
  faCut,
  faPaste,
  faPen,
  faPlus,
  faSquare,
  faTrashCan
} from '@fortawesome/free-solid-svg-icons'
import { isKeySelection, isMultiSelection, isValueSelection } from '$lib/logic/selection'
import { tString } from '$lib/i18n'
import { getIn } from 'immutable-json-patch'
import { getFocusPath, singleItemSelected } from '$lib/logic/selection'
import { isObjectOrArray } from '$lib/utils/typeUtils'
import { getEnforceString } from '$lib/logic/documentState'

export default function ({
  json,
  documentState,
  selection,
  readOnly,
  onEditValue,
  onEditRow,
  onToggleEnforceString,
  onCut,
  onCopy,
  onPaste,
  onRemove,
  onDuplicateRow,
  onInsertBeforeRow,
  onInsertAfterRow,
  onRemoveRow
}: {
  json: unknown | undefined
  documentState: DocumentState | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  onEditValue: () => void
  onEditRow: () => void
  onToggleEnforceString: () => void
  onCut: (indent: boolean) => void
  onCopy: (indent: boolean) => void
  onPaste: () => void
  onRemove: () => void
  onDuplicateRow: () => void
  onInsertBeforeRow: () => void
  onInsertAfterRow: () => void
  onRemoveRow: () => void
}): ContextMenuItem[] {
  const hasJson = json !== undefined
  const hasSelection = !!selection
  const focusValue =
    json !== undefined && selection ? getIn(json, getFocusPath(selection)) : undefined

  const hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  const canEditValue =
    !readOnly && hasJson && selection !== undefined && singleItemSelected(selection)
  const canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  const canCut = !readOnly && hasSelectionContents

  const enforceString =
    selection !== undefined ? getEnforceString(json, documentState, getFocusPath(selection)) : false

  return [
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            { type: 'label', text: `${tString('tableCell')}:` },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: () => onEditValue(),
                icon: faPen,
                text: tString('Edit'),
                title: tString('editValue') + ' (Double-click on the value)',
                disabled: !canEditValue
              },
              width: '11em',
              items: [
                {
                  type: 'button',
                  icon: faPen,
                  text: tString('Edit'),
                  title: tString('editValue') + ' (Double-click on the value)',
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
            },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: () => onCut(true),
                icon: faCut,
                text: tString('cut'),
                title: tString('cutFormattedTitle') + ' (Ctrl+X)',
                disabled: !canCut
              },
              width: '10em',
              items: [
                {
                  type: 'button',
                  icon: faCut,
                  text: tString('cutFormatted'),
                  title: tString('cutFormattedTitle') + ' (Ctrl+X)',
                  onClick: () => onCut(true),
                  disabled: readOnly || !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCut,
                  text: tString('cutCompacted'),
                  title: tString('cutCompactedTitle') + ' (Ctrl+Shift+X)',
                  onClick: () => onCut(false),
                  disabled: readOnly || !hasSelectionContents
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
                title: tString('copyWithIndent') + ' (Ctrl+C)',
                disabled: !hasSelectionContents
              },
              width: '12em',
              items: [
                {
                  type: 'button',
                  icon: faCopy,
                  text: tString('copyFormatted'),
                  title: tString('copyWithIndent') + '(Ctrl+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCopy,
                  text: tString('copyCompacted'),
                  title: tString('copyWithoutIndent') + '(Ctrl+Shift+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'button',
              onClick: () => onPaste(),
              icon: faPaste,
              text: tString('paste'),
              title: tString('pasteTitle') + ' (Ctrl+V)',
              disabled: readOnly || !hasSelection
            },
            {
              type: 'button',
              onClick: () => onRemove(),
              icon: faTrashCan,
              text: tString('remove'),
              title: tString('removeSelected') + ' (Delete)',
              disabled: readOnly || !hasSelectionContents
            }
          ]
        },
        {
          type: 'column',
          items: [
            { type: 'label', text: `${tString('tableRow')}:` },
            {
              type: 'button',
              onClick: () => onEditRow(),
              icon: faPen,
              text: tString('editRow'),
              title: tString('editCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onDuplicateRow(),
              icon: faClone,
              text: tString('duplicateRow'),
              title: tString('duplicateCurrentRow') + ' (Ctrl+D)',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertBeforeRow(),
              icon: faPlus,
              text: tString('insertBefore'),
              title: tString('insertRowBeforeCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertAfterRow(),
              icon: faPlus,
              text: tString('insertAfter'),
              title: tString('insertRowAfterCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onRemoveRow(),
              icon: faTrashCan,
              text: tString('removeRow'),
              title: tString('removeCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            }
          ]
        }
      ]
    }
  ]
}
