<svelte:options immutable={true} />

<script>
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import EditableDiv from '../../../components/controls/EditableDiv.svelte'

  export let path
  export let value
  export let normalization
  export let onPatch
  export let onPasteJson
  export let onSelect

  function handleChangeValue(newValue, passiveExit = false) {
    onPatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: stringConvert(normalization.unescapeValue(newValue)) // TODO: implement support for type "string"
        }
      ],
      null
    )

    if (!passiveExit) {
      onSelect({
        type: SELECTION_TYPE.VALUE,
        path,
        nextInside: true
      })
    }
  }

  function handleCancelChange() {
    onSelect({ type: SELECTION_TYPE.VALUE, path })
  }

  function handlePaste(pastedText) {
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

  function handleOnValueClass(value) {
    return getValueClass(stringConvert(normalization.unescapeValue(value)))
  }
</script>

<EditableDiv
  value={normalization.escapeValue(value)}
  onChange={handleChangeValue}
  onCancel={handleCancelChange}
  onPaste={handlePaste}
  onValueClass={handleOnValueClass}
/>
