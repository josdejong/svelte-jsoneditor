<script>
  import { onDestroy, onMount } from 'svelte'

  export let color
  export let onChange
  export let showOnTop

  let ref
  let colorPicker

  onMount(async () => {
    const VanillaPicker = (await import('vanilla-picker')).default

    colorPicker = new VanillaPicker({
      parent: ref,
      color: color,
      popup: showOnTop ? 'top' : 'bottom',
      onDone: function (color) {
        const alpha = color.rgba[3]
        const hex =
          alpha === 1
            ? color.hex.substr(0, 7) // return #RRGGBB
            : color.hex // return #RRGGBBAA
        onChange(hex)
      }
    })

    colorPicker.show()
  })

  onDestroy(() => {
    colorPicker.destroy()
  })
</script>

<div class="jse-color-picker-popup" bind:this={ref} />

<style src="./ColorPickerPopup.scss"></style>
