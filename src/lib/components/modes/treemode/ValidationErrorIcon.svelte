<script lang="ts">
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { getContext } from 'svelte'
  import { tooltip } from '../../controls/tooltip/tooltip.js'
  import type { AbsolutePopupContext, NestedValidationError, ValidationError } from '$lib/types.js'
  import { isNestedValidationError } from '$lib/typeguards.js'

  const absolutePopupContext = getContext<AbsolutePopupContext>('absolute-popup')

  export let validationError: NestedValidationError | ValidationError
  export let onExpand: (event: MouseEvent) => void

  $: text =
    isNestedValidationError(validationError) && validationError.isChildError
      ? 'Contains invalid data'
      : validationError.message
</script>

<button
  type="button"
  class="jse-validation-{validationError.severity}"
  on:click={onExpand}
  use:tooltip={{ text, ...absolutePopupContext }}
>
  <Icon data={faExclamationTriangle} />
</button>

<style src="./ValidationErrorIcon.scss"></style>
