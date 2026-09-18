<script lang="ts">
  import { t } from '$lib/i18n/index.js'
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
      ? $t('containsInvalidData')
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
