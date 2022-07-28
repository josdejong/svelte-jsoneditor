<script lang="ts">
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/index.es'
  import Icon from 'svelte-awesome'
  import { getContext } from 'svelte'
  import { tooltip } from '../../controls/tooltip/tooltip'
  import type { ValidationError } from '../../../types'

  const absolutePopupContext = getContext('absolute-popup')

  export let validationError: ValidationError
  export let onExpand: (event: Event) => void

  $: text = validationError.isChildError ? 'Contains invalid data' : validationError.message
</script>

<button
  type="button"
  class="jse-validation-error"
  on:click={onExpand}
  use:tooltip={{ text, ...absolutePopupContext }}
>
  <Icon data={faExclamationTriangle} />
</button>

<style src="./ValidationErrorIcon.scss"></style>
