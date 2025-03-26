<script lang="ts">
  import { getColorCSS } from '$lib/utils/typeUtils.js'
  import { getWindow } from '$lib/utils/domUtils.js'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { getContext } from 'svelte'
  import ColorPickerPopup from '../../../components/controls/ColorPickerPopup.svelte'
  import type { AbsolutePopupContext, RenderValueProps } from '$lib/types.js'

  const { openAbsolutePopup } = getContext<AbsolutePopupContext>('absolute-popup')

  const { path, value, readOnly, onPatch, focus }: RenderValueProps = $props()

  const color = $derived(getColorCSS(String(value)))
  const title = $derived(!readOnly ? 'Click to open a color picker' : `Color ${value}`)

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

    const target = event.target as Element
    const top = target.getBoundingClientRect().top
    const windowHeight = getWindow(target)?.innerHeight ?? 0
    const showOnTop = windowHeight - top < height && top > height

    const props = {
      color: value,
      onChange,
      showOnTop
    }

    openAbsolutePopup(ColorPickerPopup, props, {
      anchor: target,
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
  {title}
  aria-label={title}
  onclick={openColorPicker}
></button>

<style src="./ColorPicker.scss"></style>
