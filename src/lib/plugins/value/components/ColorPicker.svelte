<svelte:options immutable={true} />

<script lang="ts">
  import { getColorCSS } from '$lib/utils/typeUtils.js'
  import { getWindow } from '$lib/utils/domUtils.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getContext } from 'svelte'
  import ColorPickerPopup from '../../../components/controls/ColorPickerPopup.svelte'
  import type { AbsolutePopupContext, OnPatch } from '$lib/types.js'

  const { openAbsolutePopup } = getContext<AbsolutePopupContext>('absolute-popup')

  export let path: JSONPath
  export let value: string
  export let readOnly: boolean
  export let onPatch: OnPatch
  export let focus: () => void

  $: color = getColorCSS(value)

  function onChange(color: string) {
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
    focus()
  }

  function openColorPicker(event: MouseEvent) {
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
  type="button"
  class="jse-color-picker-button"
  class:jse-readonly={readOnly}
  style="background: {color}"
  title={!readOnly ? 'Click to open a color picker' : `Color ${value}`}
  on:click={openColorPicker}
/>

<style src="./ColorPicker.scss"></style>
