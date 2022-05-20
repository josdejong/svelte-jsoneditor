<svelte:options immutable={true} />

<script>
  import { getColorCSS } from '$lib/utils/typeUtils'
  import { getWindow } from '$lib/utils/domUtils'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getContext } from 'svelte'
  import ColorPickerPopup from '../../../components/controls/ColorPickerPopup.svelte'
  import { SELECTION_TYPE } from '../../../logic/selection.js'

  const { openAbsolutePopup } = getContext('absolute-popup')

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let onSelect

  $: color = getColorCSS(value)

  function onChange(color) {
    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: color
      }
    ])

    onClose()
  }

  function onClose() {
    onSelect({ type: SELECTION_TYPE.VALUE, path })
  }

  function openColorPicker(event) {
    if (readOnly) {
      return
    }

    // estimate of the color picker height
    // we'll render the color picker on top
    // when there is not enough space below, and there is enough space above
    const height = 300

    const top = event.target.getBoundingClientRect().top
    const windowHeight = getWindow(event.target).innerHeight
    const showOnTop = windowHeight - top < height && top > height

    const props = {
      color: value,
      onChange,
      showOnTop
    }

    openAbsolutePopup(ColorPickerPopup, props, {
      anchor: event.target,
      closeOnOuterClick: true,
      onClose,
      offsetTop: 18,
      offsetLeft: -8,
      height
    })
  }
</script>

<button
  class="jse-color-picker-button"
  style="background: {color}"
  title={!readOnly ? 'Click to open a color picker' : `Color ${value}`}
  on:click={openColorPicker}
/>

<style src="./ColorPicker.scss"></style>
