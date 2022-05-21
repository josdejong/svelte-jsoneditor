<svelte:options immutable={true} />

<script>
  import { compileJSONPointer } from 'immutable-json-patch'
  import { SELECTION_TYPE } from '$lib/logic/selection.js'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'

  export let path
  export let value
  export let readOnly
  export let isSelected
  export let onPatch
  export let onSelect

  /** @type {Array<{value: any, text: string}>} */
  export let options

  let refSelect

  let bindValue = value
  $: bindValue = value

  function applyFocus(isSelected) {
    if (isSelected) {
      if (refSelect) {
        refSelect.focus()
      }
    }
  }

  $: applyFocus(isSelected)

  function handleSelect(event) {
    event.stopPropagation()

    if (readOnly) {
      return
    }

    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: bindValue
      }
    ])

    onSelect({ type: SELECTION_TYPE.VALUE, path })
  }

  function handleMouseDown(event) {
    // stop propagation to prevent selecting the whole line
    event.stopPropagation()
  }
</script>

<select
  class={`jse-enum-value ${getValueClass(bindValue)}`}
  class:jse-selected={isSelected}
  bind:value={bindValue}
  bind:this={refSelect}
  on:change={handleSelect}
  on:mousedown={handleMouseDown}
>
  {#each options as option}
    <option value={option.value}>{option.text}</option>
  {/each}
</select>

<style src="./EnumValue.scss"></style>
