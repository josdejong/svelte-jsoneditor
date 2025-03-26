<script lang="ts">
  import type { JSONPatchDocument } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils.js'
  import { createValueSelection, getFocusPath, isEditingSelection } from '$lib/logic/selection.js'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass.js'
  import EditableDiv from '../../../components/controls/EditableDiv.svelte'
  import { type RenderValueProps, UpdateSelectionAfterChange } from '$lib/types.js'
  import { isEqual } from 'lodash-es'
  import { expandSmart } from '$lib/logic/documentState'

  const {
    path,
    value,
    selection,
    mode,
    parser,
    normalization,
    enforceString,
    onPatch,
    onPasteJson,
    onSelect,
    onFind,
    focus,
    findNextInside
  }: RenderValueProps = $props()

  function convert(value: string): unknown {
    return enforceString ? value : stringConvert(value, parser)
  }

  function handleChangeValue(newValue: string, updateSelection: UpdateSelectionAfterChange) {
    onPatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: convert(normalization.unescapeValue(newValue))
        }
      ],
      (_, patchedState, patchedSelection) => {
        // Leave the selection as is when it is no longer the path that we were editing here
        // This happens for example when the user clicks or double-clicks on another value
        // whilst editing a value
        if (patchedSelection && !isEqual(path, getFocusPath(patchedSelection))) {
          return undefined
        }

        const selection =
          updateSelection === UpdateSelectionAfterChange.nextInside
            ? findNextInside(path)
            : createValueSelection(path)

        return {
          state: patchedState,
          selection
        }
      }
    )

    focus()
  }

  function handleCancelChange() {
    onSelect(createValueSelection(path))
    focus()
  }

  function handlePaste(pastedText: string): void {
    try {
      const pastedJson = parser.parse(pastedText)
      if (isObjectOrArray(pastedJson)) {
        onPasteJson({
          path,
          contents: pastedJson,
          onPasteAsJson: () => {
            // exit edit mode
            handleCancelChange()

            // replace the value with the JSON object/array
            const operations: JSONPatchDocument = [
              {
                op: 'replace',
                path: compileJSONPointer(path),
                value: pastedJson
              }
            ]

            onPatch(operations, (patchedJson, patchedState) => ({
              state: expandSmart(patchedJson, patchedState, path)
            }))
          }
        })
      }
    } catch {
      // silently ignore: thee pasted text is no valid JSON object or array,
      // no need to do anything
    }
  }

  function handleOnValueClass(value: string): string {
    return getValueClass(convert(normalization.unescapeValue(value)), mode, parser)
  }
</script>

<EditableDiv
  value={normalization.escapeValue(value)}
  initialValue={isEditingSelection(selection) ? selection.initialValue : undefined}
  label="Edit value"
  onChange={handleChangeValue}
  onCancel={handleCancelChange}
  onPaste={handlePaste}
  {onFind}
  onValueClass={handleOnValueClass}
/>
