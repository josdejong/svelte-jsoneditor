<svelte:options immutable={true} />

<script>
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'
  import { SELECTION_TYPE } from '../../../logic/selection.js'

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let onSelect

  function toggleBooleanValue(event) {
    event.stopPropagation()

    if (readOnly) {
      return
    }

    onPatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: !value
      }
    ])

    onSelect({ type: SELECTION_TYPE.VALUE, path })
  }
</script>

<div
  class="jse-boolean-toggle"
  on:mousedown={toggleBooleanValue}
  title={!readOnly ? 'Click to toggle this boolean value' : `Boolean value ${value}`}
>
  <Icon data={value === true ? faCheckSquare : faSquare} />
</div>

<style src="./BooleanToggle.scss"></style>
