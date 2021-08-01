<script>
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'

  export let onPatch
  export let path
  export let value

  function toggleBooleanValue(event) {
    event.stopPropagation()

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
  title="Click to toggle this boolean value"
>
  <Icon data={value === true ? faCheckSquare : faSquare} />
</div>

<style src="./BooleanToggle.scss"></style>
