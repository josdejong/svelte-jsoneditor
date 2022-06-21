<svelte:options immutable={true} />

<script lang="ts">
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'
  import { createValueSelection } from '../../../logic/selection.js'
  import type { JSONData, OnPatch, OnSelect, Path } from '../../../types'

  export let path: Path
  export let value: JSONData
  export let readOnly: boolean
  export let onPatch: OnPatch
  export let onSelect: OnSelect

  function toggleBooleanValue(event: MouseEvent) {
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

    onSelect(createValueSelection(path, false))
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
