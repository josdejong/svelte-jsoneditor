<svelte:options immutable={true} />

<script lang="ts">
  import Icon from 'svelte-awesome'
  import { faRotate } from '@fortawesome/free-solid-svg-icons'

  export let count: number
  export let maxSampleCount: number
  export let readOnly: boolean
  export let onRefresh: () => void
</script>

<button
  type="button"
  class="jse-column-header"
  class:jse-readonly={readOnly}
  title={`The Columns are created by sampling ${maxSampleCount} items out of ${count}. ` +
    "If you're missing a column, click here to sample all of the items instead of a subset. " +
    'This is slower.'}
  on:click={() => onRefresh()}
>
  <Icon data={faRotate} />
</button>

<style src="./RefreshColumnHeader.scss"></style>
