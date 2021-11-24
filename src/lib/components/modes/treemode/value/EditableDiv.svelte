<svelte:options immutable={true} />

<script>
  import { onDestroy, onMount } from 'svelte'
  import { getPlainText, setCursorToEnd, setPlainText } from '$lib/utils/domUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import createDebug from 'debug'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isObjectOrArray, stringConvert } from '$lib/utils/typeUtils'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { getValueClass } from '$lib/components/modes/treemode/value/utils/getValueClass'

  const debug = createDebug('jsoneditor:ValueEditor')

  export let path
  export let value
  export let onPatch
  export let onPasteJson
  export let onSelect

  let domValue
  let valueClass = determineValueClass(value)
  let closed = false

  onMount(() => {
    debug('onMount', { value })
    setDomValue(value)

    // focus
    setTimeout(() => setCursorToEnd(domValue))
  })

  onDestroy(() => {
    const newValue = getDomValue()

    debug('onDestroy', { closed, value, newValue })

    if (!closed && newValue !== value) {
      applyChange(newValue)
    }
  })

  function getDomValue() {
    return getPlainText(domValue)
  }

  function setDomValue(updatedValue) {
    setPlainText(domValue, updatedValue)
  }

  function handleValueInput() {
    const newValue = getDomValue()

    if (newValue === '') {
      // immediately update to cleanup any left over <br/>
      setDomValue('')
    }

    // update class
    valueClass = determineValueClass(newValue)
  }

  function handleValueKeyDown(event) {
    event.stopPropagation()

    const combo = keyComboFromEvent(event)

    if (combo === 'Escape') {
      // cancel changes (needed to prevent triggering a change onDestroy)
      closed = true

      onSelect({ type: SELECTION_TYPE.VALUE, path })
    }

    if (combo === 'Enter' || combo === 'Tab') {
      // apply changes
      closed = true

      const newValue = getDomValue()
      applyChange(newValue)
    }
  }

  function handleValuePaste(event) {
    const clipboardText = event.clipboardData.getData('text/plain')

    try {
      const pastedJson = JSON.parse(clipboardText)
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

  function applyChange(newValue) {
    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: stringConvert(newValue) // TODO: implement support for type "string"
      }
    ])

    onSelect({ type: SELECTION_TYPE.VALUE, path, nextInside: true })
  }

  function determineValueClass(value) {
    return getValueClass(stringConvert(value))
  }
</script>

<div
  class={'jse-editable-div ' + valueClass}
  contenteditable="true"
  spellcheck="false"
  on:input={handleValueInput}
  on:keydown={handleValueKeyDown}
  on:paste={handleValuePaste}
  bind:this={domValue}
/>

<style src="./EditableDiv.scss"></style>
