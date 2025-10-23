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
import { t } from '$lib/i18n'
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
            { type: 'label', text: 'Table cell:' },
            {
              type: 'dropdown-button',
              main: {
                type: 'button',
                onClick: () => onEditValue(),
                icon: faPen,
                text: t('Edit'),
                title: t('editValue') + ' (Double-click on the value)',
                disabled: !canEditValue
              },
              width: '11em',
              items: [
                {
                  type: 'button',
                  icon: faPen,
                  text: t('Edit'),
                  title: t('editValue') + ' (Double-click on the value)',
                  onClick: () => onEditValue(),
                  disabled: !canEditValue
                },
                {
                  type: 'button',
                  icon: enforceString ? faCheckSquare : faSquare,
                  text: t('enforceString'),
                  title: t('enforceKeepingTheValue'),
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
                text: t('cut'),
                title: t('cutSelectedContentFormattedWithIndentation') + ' (Ctrl+X)',
                disabled: !canCut
              },
              width: '10em',
              items: [
                {
                  type: 'button',
                  icon: faCut,
                  text: t('cutFormatted'),
                  title: t('cutSelectedContentFormattedWithIndentation') + ' (Ctrl+X)',
                  onClick: () => onCut(true),
                  disabled: readOnly || !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCut,
                  text: t('cutCompacted'),
                  title: t('cutSelectedContentWithoutIndent') + ' (Ctrl+Shift+X)',
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
                text: t('copy'),
                title: t('copySelectedContendWithIndent') + ' (Ctrl+C)',
                disabled: !hasSelectionContents
              },
              width: '12em',
              items: [
                {
                  type: 'button',
                  icon: faCopy,
                  text: t('copyFormatted'),
                  title: t('copySelectedContendWithIndent') + '(Ctrl+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: faCopy,
                  text: t('copyCompacted'),
                  title: t('copySelectedContendWithoutIndent') + '(Ctrl+Shift+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'button',
              onClick: () => onPaste(),
              icon: faPaste,
              text: t('paste'),
              title: t('pastClipboardContent') + ' (Ctrl+V)',
              disabled: readOnly || !hasSelection
            },
            {
              type: 'button',
              onClick: () => onRemove(),
              icon: faTrashCan,
              text: t('remove'),
              title: t('removeSelected') + ' (Delete)',
              disabled: readOnly || !hasSelectionContents
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
              text: t('editRow'),
              title: t('editCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onDuplicateRow(),
              icon: faClone,
              text: t('duplicateRow'),
              title: t('Duplicate the current row') + ' (Ctrl+D)',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertBeforeRow(),
              icon: faPlus,
              text: t('insertBefore'),
              title: t('insertRowBeforeCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertAfterRow(),
              icon: faPlus,
              text: t('insertAfter'),
              title: t('insertRowAfterCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onRemoveRow(),
              icon: faTrashCan,
              text: t('removeRow'),
              title: t('removeCurrentRow'),
              disabled: readOnly || !hasSelection || !hasJson
            }
          ]
        }
      ]
    }
  ]
}
