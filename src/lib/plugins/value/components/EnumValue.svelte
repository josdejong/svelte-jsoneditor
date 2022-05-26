<svelte:options immutable={true} />

<script lang="ts">
  import { compileJSONPointer } from 'immutable-json-patch'
  import { SELECTION_TYPE } from '../../../logic/selection'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import type { JSONData, OnPatch, OnSelect, Path } from '../../../types'

  export let path: Path
  export let value: JSONData
  export let readOnly: boolean
  export let isSelected: boolean
  export let onPatch: OnPatch
  export let onSelect: OnSelect

  export let options: Array<{ value: unknown; text: string }>

  let refSelect: HTMLSelectElement | undefined

  let bindValue: JSONData = value
  $: bindValue = value

  function applyFocus(isSelected: boolean) {
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
