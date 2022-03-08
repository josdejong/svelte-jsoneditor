<script>
  import { onDestroy, onMount, tick } from 'svelte'
  import VanillaPicker from 'vanilla-picker'

  export let color
  export let onChange
  export let showOnTop

  let ref
  let colorPicker

  onMount(async () => {
    await tick() // must render the DOM first

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
