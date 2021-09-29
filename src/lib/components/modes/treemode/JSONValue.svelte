<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isEqual } from 'lodash-es'
  import { onDestroy } from 'svelte'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { getPlainText, setCursorToEnd, setPlainText } from '$lib/utils/domUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import {
    isBoolean,
    isColor,
    isObjectOrArray,
    isTimestamp,
    isUrl,
    stringConvert,
    valueType
  } from '$lib/utils/typeUtils'
  import BooleanToggle from './value/BooleanToggle.svelte'
  import Timestamp from '../../../components/modes/treemode/value/Timestamp.svelte'
  import Color from '../../../components/modes/treemode/value/Color.svelte'
  import SearchResultHighlighter from '$lib/components/modes/treemode/highlight/SearchResultHighlighter.svelte'

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let selection
  export let onSelect
  export let onPasteJson

  /** @type {SearchResultItem | undefined} */
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
  $: valueClass = getValueClass(newValue)
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

  function getValueClass(value) {
    const type = valueType(value)

    return classnames('editable-div', SELECTION_TYPE.VALUE, type, {
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
  {#if isColor(value)}
    <Color {path} {value} {onPatch} {readOnly} />
  {/if}
{/if}

{#if editValue}
  <div
    data-type="selectable-value"
    class={valueClass}
    contenteditable="true"
    spellcheck="false"
    on:input={handleValueInput}
    on:click={handleValueClick}
    on:dblclick={handleValueDoubleClick}
    on:keydown={handleValueKeyDown}
    on:paste={handleValuePaste}
    bind:this={domValue}
  />
{:else}
  <div
    data-type="selectable-value"
    class={valueClass}
    contenteditable="false"
    spellcheck="false"
    on:click={handleValueClick}
    on:dblclick={handleValueDoubleClick}
    title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : null}
  >
    {#if searchResult}
      <SearchResultHighlighter text={String(value)} {searchResult} />
    {:else}
      {value}
    {/if}
  </div>

  <!-- TODO: create an API to customize rendering of a value -->
  {#if isTimestamp(value)}
    <Timestamp {value} />
  {/if}
{/if}

<style src="./JSONValue.scss"></style>
