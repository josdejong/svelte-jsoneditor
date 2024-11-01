<svelte:options immutable={true} />

<script lang="ts">
  import { compileJSONPointer, type JSONPath } from 'immutable-json-patch'
  import {
    createValueSelection,
    type OnPatch,
    type OnSelect,
    type ValueNormalization
  } from 'svelte-jsoneditor'

  export let value: unknown
  export let path: JSONPath
  export let enforceString: boolean
  export let normalization: ValueNormalization
  export let onSelect: OnSelect
  export let onPatch: OnPatch
  export let focus: () => void

  export let inputValue: string = normalization.escapeValue(value)

  function convert(value: string): unknown {
    if (enforceString) {
      return value
    }

    if (value === '') {
      return ''
    }

    const valueTrim = value.trim()

    if (valueTrim === 'null') {
      return null
    }

    if (valueTrim === 'true') {
      return true
    }

    if (valueTrim === 'false') {
      return false
    }

    const number = Number(value)
    if (!isNaN(number)) {
      return number
    }

    return value
  }

  function apply() {
    console.log('apply')
    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: convert(normalization.unescapeValue(inputValue))
      }
    ])

    focus()
  }

  function cancel() {
    onSelect(createValueSelection(path))

    focus()
  }

  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation()
  }

  function handleKeyDown(event: KeyboardEvent) {
    event.stopPropagation()

    if (event.key === 'Enter') {
      event.preventDefault()
      apply()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }
</script>

<!-- svelte-ignore a11y-autofocus -->
<input
  bind:value={inputValue}
  class="jse-value jse-custom-input"
  on:mousedown={handleMouseDown}
  on:keydown={handleKeyDown}
  autofocus
/>
<button type="button" class="apply" on:click={apply}>Apply</button>
<button type="button" class="cancel" on:click={cancel}>Cancel</button>

<style>
  input.jse-value.jse-custom-input {
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    border: none;
    background: white !important;
    outline: 2px solid red;
  }

  button {
    font-family: inherit;
    font-size: inherit;
    border: none;
    color: white;
    background: red;
    outline: 2px solid red;
    margin-left: 0.5em;
    cursor: pointer;

    &:hover {
      background: rgb(255, 68, 68);
    }
  }
</style>
