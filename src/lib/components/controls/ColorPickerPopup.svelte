<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let color: string
  export let onChange: (newColor: string) => void
  export let showOnTop: boolean

  let ref: HTMLElement | undefined
  let destroyColorPicker = () => {}

  onMount(async () => {
    // Dynamically import VanillaPicker, because it requires `document` to be defined,
    // and that is not supported server side
    const VanillaPicker = (await import('vanilla-picker'))?.default

    const colorPicker = new VanillaPicker({
      parent: ref,
      color,
      popup: showOnTop ? 'top' : 'bottom',
      onDone: function (color) {
        const alpha = color.rgba[3]
        const hex =
          alpha === 1
            ? color.hex.substring(0, 7) // return #RRGGBB
            : color.hex // return #RRGGBBAA
        onChange(hex)
      }
    })

    colorPicker.show()

    destroyColorPicker = () => {
      colorPicker.destroy()
    }
  })

  onDestroy(() => {
    destroyColorPicker()
  })
</script>

<div class="jse-color-picker-popup" bind:this={ref}></div>

<style src="./ColorPickerPopup.scss"></style>
