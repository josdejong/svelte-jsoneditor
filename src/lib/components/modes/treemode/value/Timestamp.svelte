<script>
  import Icon from 'svelte-awesome'
  import { faClock } from '@fortawesome/free-regular-svg-icons'
  import { getContext } from 'svelte'
  import { tooltip } from '../../../controls/tooltip/tooltip'

  const absolutePopupContext = getContext('absolute-popup')

  export let value

  $: text = new Date(value).toString()
</script>

<div class="jse-timestamp" use:tooltip={{ text, ...absolutePopupContext }}>
  <Icon data={faClock} />
</div>

<style src="Timestamp.scss"></style>
