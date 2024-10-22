<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils.js'
  import { createValueSelection, getFocusPath, isEditingSelection } from '$lib/logic/selection.js'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass.js'
  import EditableDiv from '../../../components/controls/EditableDiv.svelte'
  import {
    type FindNextInside,
    type JSONParser,
    type JSONSelection,
    Mode,
    type OnFind,
    type OnJSONSelect,
    type OnPasteJson,
    type OnPatch,
    UpdateSelectionAfterChange,
    type ValueNormalization
  } from '$lib/types.js'
  import { isEqual } from 'lodash-es'
  import { expandSmart } from '$lib/logic/documentState'

  export let path: JSONPath
  export let value: unknown
  export let selection: JSONSelection | undefined
  export let mode: Mode
  export let parser: JSONParser
  export let normalization: ValueNormalization
  export let enforceString: boolean
  export let onPatch: OnPatch
  export let onPasteJson: OnPasteJson
  export let onSelect: OnJSONSelect
  export let onFind: OnFind
  export let focus: () => void
  export let findNextInside: FindNextInside

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
