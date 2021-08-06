<script>
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { getContext } from 'svelte'
  import ValidationErrorPopup from '../../../components/modes/treemode/ValidationErrorPopup.svelte'

  const { openAbsolutePopup, closeAbsolutePopup } = getContext('absolute-popup')

  export let validationError
  export let onExpand

  let refButton

  function handleMouseOver() {
    const props = {
      text: validationError.isChildError ? 'Contains invalid data' : validationError.message
    }

    openAbsolutePopup(ValidationErrorPopup, props, {
      position: 'top',
      width: 10 * props.text.length, // rough estimate of the width of the message
      offsetTop: 3,
      anchor: refButton,
      closeOnOuterClick: true
    })
  }

  function handleMouseOut() {
    closeAbsolutePopup()
  }
</script>

<button
  bind:this={refButton}
  type="button"
  class="validation-error"
  on:click={onExpand}
  on:mouseover={handleMouseOver}
  on:mouseout={handleMouseOut}
>
  <Icon data={faExclamationTriangle} />
</button>

<style src="./ValidationError.scss"></style>
