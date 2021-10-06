<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { isEqual } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
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
  import Timestamp from './value/Timestamp.svelte'
  import Color from './value/Color.svelte'
  import EditableDiv from './value/EditableDiv.svelte'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { escapeHTML } from '$lib/utils/domUtils'

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let selection
  export let onSelect
  export let onPasteJson

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  $: selectedValue =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false
  $: editValue = !readOnly && selectedValue && selection && selection.edit === true
  $: valueIsUrl = isUrl(value)

  function getValueClass(value) {
    const type = valueType(value)

    return classnames(SELECTION_TYPE.VALUE, type, {
      url: isUrl(value),
      empty: typeof value === 'string' && value.length === 0
    })
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

  function handleChangeValue(newValue) {
    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: stringConvert(newValue) // TODO: implement support for type "string"
      }
    ])

    onSelect({ type: SELECTION_TYPE.VALUE, path, nextInside: true })
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
    return getValueClass(stringConvert(value))
  }
</script>

{#if editValue}
  <EditableDiv
    {value}
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
    onPaste={handlePaste}
    onValueClass={handleOnValueClass}
  />
{:else}
  <!-- TODO: create an API to customize rendering of a value -->

  {#if isBoolean(value)}
    <BooleanToggle {path} {value} {onPatch} />
  {/if}
  {#if isColor(value)}
    <Color {path} {value} {onPatch} {readOnly} />
  {/if}

  <div
    data-type="selectable-value"
    class={getValueClass(value)}
    on:click={handleValueClick}
    on:dblclick={handleValueDoubleClick}
    title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : null}
  >
    {#if searchResult}
      <SearchResultHighlighter text={String(value)} {searchResult} />
    {:else}
      {escapeHTML(value)}
    {/if}
  </div>

  <!-- TODO: create an API to customize rendering of a value -->
  {#if isTimestamp(value)}
    <Timestamp {value} />
  {/if}
{/if}

<style src="./JSONValue.scss"></style>
