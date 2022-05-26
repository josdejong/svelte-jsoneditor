<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { addNewLineSuffix, removeNewLineSuffix, setCursorToEnd } from '$lib/utils/domUtils'
  import { keyComboFromEvent } from '../../utils/keyBindings'
  import { createDebug } from '../../utils/debug'
  import classnames from 'classnames'
  import { noop } from 'lodash-es'
  import { UPDATE_SELECTION } from '../../constants.js'
  import type { OnFind, OnPaste } from '../../types'

  const debug = createDebug('jsoneditor:EditableDiv')

  export let value: string
  export let shortText = false
  export let onChange: (newValue: string, updateSelection: string) => void
  export let onCancel: () => void
  export let onFind: OnFind
  export let onPaste: OnPaste = noop
  export let onValueClass: (value: string) => string = () => ''

  let domValue: HTMLDivElement | undefined
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
      onChange(newValue, UPDATE_SELECTION.NO)
    }
  })

  function getDomValue(): string {
    return removeNewLineSuffix(domValue.innerText)
  }

  function setDomValue(updatedValue: string) {
    domValue.innerText = addNewLineSuffix(updatedValue)
  }

  function handleValueInput() {
    const newValue = getDomValue()

    if (newValue === '') {
      // immediately update to clean up any left over <br/>
      setDomValue('')
    }

    // update class
    valueClass = onValueClass(newValue)
  }

  function handleValueKeyDown(event) {
    event.stopPropagation()

    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    if (combo === 'Escape') {
      // cancel changes (needed to prevent triggering a change onDestroy)
      closed = true

      onCancel()
    }

    if (combo === 'Enter' || combo === 'Tab') {
      // apply changes
      closed = true

      const newValue = getDomValue()
      onChange(newValue, UPDATE_SELECTION.NEXT_INSIDE)
    }

    if (combo === 'Ctrl+F') {
      event.preventDefault()
      onFind(false)
    }

    if (combo === 'Ctrl+H') {
      event.preventDefault()
      onFind(true)
    }
  }

  function handleValuePaste(event: ClipboardEvent) {
    if (!onPaste) {
      return
    }

    const clipboardText = event.clipboardData.getData('text/plain')
    onPaste(clipboardText)
  }

  function handleBlur() {
    const hasFocus = document.hasFocus()
    const newValue = getDomValue()

    debug('handleBlur', { hasFocus, closed, value, newValue })

    // we only want to close the editable div when the focus did go to another
    // element on the same page, but not when the user switches to another
    // application or browser tab to copy/paste something whilst still editing
    // the value, hence the check for document.hasFocus()
    if (document.hasFocus() && !closed) {
      closed = true
      if (newValue !== value) {
        onChange(newValue, UPDATE_SELECTION.SELF)
      } else {
        onCancel()
      }
    }
  }
</script>

<div
  class={classnames('jse-editable-div', valueClass, { 'jse-short-text': shortText })}
  contenteditable="true"
  spellcheck="false"
  on:input={handleValueInput}
  on:keydown={handleValueKeyDown}
  on:paste={handleValuePaste}
  on:blur={handleBlur}
  bind:this={domValue}
/>

<style src="./EditableDiv.scss"></style>
