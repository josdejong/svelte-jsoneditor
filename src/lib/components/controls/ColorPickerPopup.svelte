<script>
  import { onDestroy, onMount } from 'svelte'

  export let color
  export let onChange
  export let showOnTop

  let ref
  let colorPicker

  onMount(async () => {
    // Dynamically import VanillaPicker, because it requires `document` to be defined,
    // and that is not supported server side
    const VanillaPicker = (await import('vanilla-picker')).default

    colorPicker = new VanillaPicker({
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
  })

  onDestroy(() => {
    if (colorPicker) {
      colorPicker.destroy()
    }
  })
</script>

<div class="jse-color-picker-popup" bind:this={ref} />

<style src="./ColorPickerPopup.scss"></style>
