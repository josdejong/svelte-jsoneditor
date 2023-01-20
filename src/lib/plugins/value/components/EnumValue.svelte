<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath, JSONValue } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass'
  import type { JSONParser, JSONSelection, OnPatch } from '../../../types'
  import { isValueSelection } from '$lib/logic/selection'

  export let path: JSONPath
  export let value: JSONValue
  export let parser: JSONParser
  export let readOnly: boolean
  export let selection: JSONSelection | undefined
  export let onPatch: OnPatch

  export let options: Array<{ value: unknown; text: string }>

  let refSelect: HTMLSelectElement | undefined

  let bindValue: JSONValue = value
  $: bindValue = value

  function applyFocus(selection: JSONSelection | undefined) {
    if (selection) {
      if (refSelect) {
        refSelect.focus()
      }
    }
  }

  $: applyFocus(selection)

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
  class:jse-selected={isValueSelection(selection)}
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
