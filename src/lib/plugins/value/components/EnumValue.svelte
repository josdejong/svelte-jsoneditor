<svelte:options immutable={true} />

<script>
  import { compileJSONPointer } from 'immutable-json-patch'

  export let path
  export let value
  export let readOnly
  export let isSelected
  export let onPatch

  /** @type {Array<{value: any, text: string}>} */
  export let options

  let selected = value
  $: selected = value

  function handleSelect(event) {
    event.stopPropagation()

    if (readOnly) {
      return
    }

    onPatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: selected
        }
      ],
      null
    )
  }

  function handleMouseDown(event) {
    event.stopPropagation()
  }

  // FIXME: handle focus/blur correctly, make sure also arrow keys and enter work to select/edit
  // FIXME: losing focus after selecting a value
  // TODO: colorize the value when it is a string/number/etc
</script>

<select
  class="jse-enum-value"
  class:selected={isSelected}
  bind:value={selected}
  on:change={handleSelect}
  on:mousedown={handleMouseDown}
>
  {#each options as option}
    <option value={option.value}>{option.text}</option>
  {/each}
</select>

<style src="./EnumValue.scss"></style>
