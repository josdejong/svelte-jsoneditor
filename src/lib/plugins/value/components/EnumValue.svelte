<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONValue, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import type { OnPatch } from '../../../types'

  export let path: JSONPath
  export let value: JSONValue
  export let parser: JSON
  export let readOnly: boolean
  export let isSelected: boolean
  export let onPatch: OnPatch

  export let options: Array<{ value: unknown; text: string }>

  let refSelect: HTMLSelectElement | undefined

  let bindValue: JSONValue = value
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
  }

  function handleMouseDown(event) {
    // stop propagation to prevent selecting the whole line
    event.stopPropagation()
  }
</script>

<select
  class={`jse-enum-value ${getValueClass(bindValue, parser)}`}
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
