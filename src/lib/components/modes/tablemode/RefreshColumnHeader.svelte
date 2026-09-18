<svelte:options immutable={true} />

<script lang="ts">
  import Icon from 'svelte-awesome'
  import { faRotate } from '@fortawesome/free-solid-svg-icons'

  export let count: number
  export let maxSampleCount: number
  export let readOnly: boolean
  export let onRefresh: () => void
  import { t } from '$lib/i18n/index.js'
</script>

<button
  type="button"
  class="jse-column-header"
  class:jse-readonly={readOnly}
  title={$t('columnsSampledWarning', {
    maxSampleCount: String(maxSampleCount),
    count: String(count)
  })}
  on:click={() => onRefresh()}
>
  <Icon data={faRotate} />
</button>

<style src="./RefreshColumnHeader.scss"></style>
