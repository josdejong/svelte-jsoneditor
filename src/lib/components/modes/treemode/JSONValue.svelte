<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isEqual } from 'lodash-es'
  import { onDestroy } from 'svelte'
  import { ACTIVE_SEARCH_RESULT, STATE_SEARCH_VALUE } from '../../../constants.js'
  import { SELECTION_TYPE } from '../../../logic/selection.js'
  import { getPlainText, setCursorToEnd, setPlainText } from '../../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'
  import {
    isBoolean,
    isObjectOrArray,
    isTimestamp,
    isUrl,
    stringConvert,
    valueType
  } from '../../../utils/typeUtils.js'
  import BooleanToggle from './value/BooleanToggle.svelte'
  import Timestamp from '$lib/components/modes/treemode/value/Timestamp.svelte'

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let selection
  export let onSelect
  export let onPasteJson
  export let searchResult

  onDestroy(() => {
    updateValue()
  })

  let domValue
  let newValue = value
  let valueClass

  $: selectedValue =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false
  $: valueClass = getValueClass(newValue, searchResult)
  $: editValue = selectedValue && selection && selection.edit === true
  $: valueIsUrl = isUrl(value)

  $: if (editValue === true) {
    focusValue()
  }

  $: if (editValue === false) {
    updateValue()
  }

  $: if (domValue) {
    setDomValue(value)
  }

  function updateValue() {
    if (newValue !== value) {
      value = newValue // prevent loops when value and newValue are temporarily not in sync

      onPatch([
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: newValue
        }
      ])
    }
  }

  function getDomValue() {
    if (!domValue) {
      return value
    }

    const valueText = getPlainText(domValue)
    return stringConvert(valueText) // TODO: implement support for type "string"
  }

  function setDomValue(updatedValue) {
    if (domValue) {
      newValue = updatedValue
      setPlainText(domValue, updatedValue)
    }
  }

  function focusValue() {
    // TODO: this timeout is ugly
    setTimeout(() => {
      if (domValue) {
        setCursorToEnd(domValue)
      }
    })
  }

  function getValueClass(value, searchResult) {
    const type = valueType(value)

    return classnames('editable-div', SELECTION_TYPE.VALUE, type, {
      search: searchResult && searchResult[STATE_SEARCH_VALUE],
      active: searchResult && searchResult[STATE_SEARCH_VALUE] === ACTIVE_SEARCH_RESULT,
      url: isUrl(value),
      empty: typeof value === 'string' && value.length === 0
    })
  }

  function handleValueInput() {
    newValue = getDomValue()
    if (newValue === '') {
      // immediately update to cleanup any left over <br/>
      setDomValue('')
    }
  }

  function handleValueClick(event) {
    if (valueIsUrl && event.ctrlKey) {
      event.preventDefault()
      event.stopPropagation()

      window.open(value, '_blank')
    }
  }

  function handleValueDoubleClick(event) {
    if (!readOnly && !editValue) {
      event.preventDefault()
      onSelect({ type: SELECTION_TYPE.VALUE, path, edit: true })
    }
  }

  function handleValueKeyDown(event) {
    event.stopPropagation()

    const combo = keyComboFromEvent(event)

    if (combo === 'Escape') {
      // cancel changes
      setDomValue(value)
      onSelect({ type: SELECTION_TYPE.VALUE, path })
    }

    if (!readOnly && (combo === 'Enter' || combo === 'Tab')) {
      // updating newValue here is important to handle when contents are changed
      // programmatically when edit mode is opened after typing a character
      newValue = getDomValue()

      // apply changes
      updateValue()

      onSelect({ type: SELECTION_TYPE.VALUE, path, nextInside: true })
    }
  }

  function handleValuePaste(event) {
    try {
      const clipboardText = event.clipboardData.getData('text/plain')
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
</script>

<!-- TODO: create an API to customize rendering of a value -->
{#if !editValue}
  {#if isBoolean(value)}
    <BooleanToggle {path} {value} {onPatch} />
  {/if}
{/if}

<div
  data-type="selectable-value"
  class={valueClass}
  contenteditable={editValue}
  spellcheck="false"
  on:input={handleValueInput}
  on:click={handleValueClick}
  on:dblclick={handleValueDoubleClick}
  on:keydown={handleValueKeyDown}
  on:paste={handleValuePaste}
  bind:this={domValue}
  title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : null}
/>

<!-- TODO: create an API to customize rendering of a value -->
{#if !editValue}
  {#if isTimestamp(value)}
    <Timestamp {value} />
  {/if}
{/if}

<style src="./JSONValue.scss"></style>
