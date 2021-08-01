<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faTimes } from '@fortawesome/free-solid-svg-icons'

  export let title = 'Modal'

  const { close } = getContext('simple-modal')
</script>

<div class="header">
  <div class="title">
    {title}
  </div>
  <button type="button" class="close" on:click={close}>
    <Icon data={faTimes} />
  </button>
</div>

<style src="./Header.scss"></style>
