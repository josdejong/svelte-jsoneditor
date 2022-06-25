<svelte:options immutable={true} />

<script lang="ts">
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils'
  import { createValueSelection, getSelectionNextInside } from '../../../logic/selection'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import EditableDiv from '../../../components/controls/EditableDiv.svelte'
  import { UPDATE_SELECTION } from '../../../constants.js'
  import type {
    JSONData,
    OnFind,
    OnPasteJson,
    OnPatch,
    OnSelect,
    Path,
    ValueNormalization
  } from '../../../types'

  export let path: Path
  export let value: JSONData
  export let normalization: ValueNormalization
  export let enforceString: boolean
  export let onPatch: OnPatch
  export let onPasteJson: OnPasteJson
  export let onSelect: OnSelect
  export let onFind: OnFind
  export let focus: () => void

  function convert(value: string) {
    return enforceString ? value : stringConvert(value)
  }

  function handleChangeValue(newValue: string, updateSelection: string) {
    onPatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: convert(normalization.unescapeValue(newValue))
        }
      ],
      (patchedJson, patchedState) => {
        const selection =
          updateSelection === UPDATE_SELECTION.NEXT_INSIDE
            ? getSelectionNextInside(patchedJson, patchedState, path) || patchedState.selection
            : createValueSelection(path, false)

        return {
          state: {
            ...patchedState,
            selection
          }
        }
      }
    )

    if (updateSelection !== UPDATE_SELECTION.SELF) {
      focus()
    }
  }

  function handleCancelChange() {
    onSelect(createValueSelection(path, false))
    focus()
  }

  function handlePaste(pastedText: string): void {
    try {
      const pastedJson = JSON.parse(pastedText)
      if (isObjectOrArray(pastedJson)) {
        onPasteJson({
          path,
          contents: pastedJson
        })
      }
    } catch (err) {
      // silently ignore: thee pasted text is no valid JSON object or array,
      // no need to do anything
    }
  }

  function handleOnValueClass(value: string): string {
    return getValueClass(convert(normalization.unescapeValue(value)))
  }
</script>

<EditableDiv
  value={normalization.escapeValue(value)}
  onChange={handleChangeValue}
  onCancel={handleCancelChange}
  onPaste={handlePaste}
  {onFind}
  onValueClass={handleOnValueClass}
/>
