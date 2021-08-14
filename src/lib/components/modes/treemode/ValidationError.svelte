<script>
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { getContext } from 'svelte'
  import { tooltip } from '../../controls/tooltip/tooltip'

  const absolutePopupContext = getContext('absolute-popup')

  export let validationError
  export let onExpand

  $: text = validationError.isChildError ? 'Contains invalid data' : validationError.message
</script>

<button
  type="button"
  class="validation-error"
  on:click={onExpand}
  use:tooltip={{ text, ...absolutePopupContext }}
>
  <Icon data={faExclamationTriangle} />
</button>

<style src="./ValidationError.scss"></style>
