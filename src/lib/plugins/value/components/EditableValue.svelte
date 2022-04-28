<svelte:options immutable={true} />

<script>
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import EditableDiv from '../../../components/controls/EditableDiv.svelte'
  import { UPDATE_SELECTION } from '../../../constants.js'

  export let path
  export let value
  export let normalization
  export let enforceString
  export let onPatch
  export let onPasteJson
  export let onSelect
  export let onFind

  function convert(value) {
    return enforceString ? value : stringConvert(value)
  }

  function handleChangeValue(newValue, updateSelection) {
    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: convert(normalization.unescapeValue(newValue))
      }
    ])

    if (updateSelection === UPDATE_SELECTION.NEXT_INSIDE) {
      onSelect({
        type: SELECTION_TYPE.VALUE,
        path,
        nextInside: true
      })
    }

    if (updateSelection === UPDATE_SELECTION.SELF) {
      onSelect(
        {
          type: SELECTION_TYPE.VALUE,
          path
        },
        { ensureFocus: false }
      )
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
