<svelte:options immutable={true} />

<script>
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'

  export let path
  export let value
  export let readOnly
  export let onPatch

  function toggleBooleanValue(event) {
    event.stopPropagation()

    if (readOnly) {
      return
    }

    onPatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: !value
        }
      ],
      null
    )
  }
</script>

<div
  class="boolean-toggle"
  on:mousedown={toggleBooleanValue}
  title={!readOnly ? 'Click to toggle this boolean value' : undefined}
>
  <Icon data={value === true ? faCheckSquare : faSquare} />
</div>

<style src="./BooleanToggle.scss"></style>
