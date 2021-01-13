<script>
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import Sveltip from 'sveltip'

  export let validationError
  export let onExpand

  $: message = validationError.isChildError
    ? 'Contains invalid data'
    : validationError.message
</script>

<Sveltip dark text={message} top >
  <button
    class='validation-error'
    on:click={onExpand}
  >
    <Icon data={faExclamationTriangle} />
  </button>
</Sveltip>

<style src="./ValidationError.scss"></style>
