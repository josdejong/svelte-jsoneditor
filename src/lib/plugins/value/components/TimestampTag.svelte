<svelte:options immutable={true} />

<script lang="ts">
  import Icon from 'svelte-awesome'
  import { faClock } from '@fortawesome/free-regular-svg-icons'
  import { getContext } from 'svelte'
  import { tooltip } from '$lib/components/controls/tooltip/tooltip.ts'

  const absolutePopupContext = getContext('absolute-popup')

  export let value: number

  $: text = `Time: ${new Date(value).toString()}`
</script>

<div class="jse-timestamp" use:tooltip={{ text, ...absolutePopupContext }}>
  <Icon data={faClock} />
</div>

<style src="./TimestampTag.scss"></style>
