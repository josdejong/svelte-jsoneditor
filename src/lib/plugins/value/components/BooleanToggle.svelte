<svelte:options immutable={true} />

<script lang="ts">
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import type { JSONValue, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'
  import type { OnPatch } from '../../../types'

  export let path: JSONPath
  export let value: JSONValue
  export let readOnly: boolean
  export let onPatch: OnPatch
  export let focus: () => void

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

    setTimeout(focus)
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
