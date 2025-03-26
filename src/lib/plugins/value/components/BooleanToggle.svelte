<script lang="ts">
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import { compileJSONPointer } from 'immutable-json-patch'
  import Icon from 'svelte-awesome'
  import type { RenderValueProps } from '$lib/types.js'

  const { path, value, readOnly, onPatch, focus }: RenderValueProps = $props()

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

    focus()
  }
</script>

<div
  role="checkbox"
  tabindex="-1"
  aria-checked={value === true}
  class="jse-boolean-toggle"
  class:jse-readonly={readOnly}
  onmousedown={toggleBooleanValue}
  title={!readOnly ? 'Click to toggle this boolean value' : `Boolean value ${value}`}
>
  <Icon data={value === true ? faCheckSquare : faSquare} />
</div>

<style src="./BooleanToggle.scss"></style>
