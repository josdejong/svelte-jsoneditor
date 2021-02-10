<script>
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'
  import { SELECTION_TYPE } from '../../../logic/selection.js'

  export let onPatch
  export let onSelect
  export let path
  export let value

  function toggleBooleanValue (event) {
    event.stopPropagation()

    onPatch([{
      op: 'replace',
      path: compileJSONPointer(path),
      value: !value
    }])

    onSelect({ type: SELECTION_TYPE.VALUE, path })
  }

</script>

<div
  class="boolean-toggle"
  on:mousedown={toggleBooleanValue}
>
  <Icon data={value === true ? faCheckSquare : faSquare} />
</div>

<style src="./BooleanToggle.scss"></style>
