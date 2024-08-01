<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getValueClass } from '$lib/plugins/value/components/utils/getValueClass.js'
  import { type JSONParser, type JSONSelection, Mode, type OnPatch } from '$lib/types.js'
  import { isValueSelection } from '$lib/logic/selection.js'

  export let path: JSONPath
  export let value: unknown
  export let mode: Mode
  export let parser: JSONParser
  export let readOnly: boolean
  export let selection: JSONSelection | undefined
  export let onPatch: OnPatch

  export let options: Array<{ value: unknown; text: string }>

  let refSelect: HTMLSelectElement | undefined

  let bindValue: unknown = value
  $: bindValue = value

  function applyFocus(selection: JSONSelection | undefined) {
    if (selection) {
      if (refSelect) {
        refSelect.focus()
      }
    }
  }

  $: applyFocus(selection)

  function handleSelect(event: Event) {
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

  function handleMouseDown(event: MouseEvent) {
    // stop propagation to prevent selecting the whole line
    event.stopPropagation()
  }
</script>

<select
  class={`jse-enum-value ${getValueClass(bindValue, mode, parser)}`}
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
