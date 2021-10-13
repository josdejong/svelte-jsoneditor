<svelte:options immutable={true} />

<script>
  import { onDestroy, onMount } from 'svelte'
  import { getPlainText, setCursorToEnd, setPlainText } from '$lib/utils/domUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import createDebug from 'debug'
  import { noop } from 'lodash-es'

  const debug = createDebug('jsoneditor:ValueEditor')

  export let value
  export let onChange
  export let onCancel
  export let onPaste = noop
  export let onValueClass = () => ''

  let domValue
  let valueClass = onValueClass(value)
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
      onChange(newValue)
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
    valueClass = onValueClass(newValue)
  }

  function handleValueKeyDown(event) {
    event.stopPropagation()

    const combo = keyComboFromEvent(event)

    if (combo === 'Escape') {
      // cancel changes (needed to prevent triggering a change onDestroy)
      closed = true

      onCancel()
    }

    if (combo === 'Enter' || combo === 'Tab') {
      // apply changes
      closed = true

      const newValue = getDomValue()
      onChange(newValue)
    }
  }

  function handleValuePaste(event) {
    if (!onPaste) {
      return
    }

    const clipboardText = event.clipboardData.getData('text/plain')
    onPaste(clipboardText)
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
