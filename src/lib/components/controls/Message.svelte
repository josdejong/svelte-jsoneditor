<svelte:options immutable={true} />

<script>
  import Icon from 'svelte-awesome'

  export let type = 'success' // 'success' or 'error'
  export let icon = null
  export let message = null
  export let actions = []
  export let onClick = null

  function handleClick() {
    if (onClick) {
      onClick()
    }
  }
</script>

<div class="jse-message jse-{type}">
  <div class="jse-text" class:jse-clickable={onClick !== null} on:click={handleClick}>
    {#if icon}
      <Icon data={icon} />
    {/if}
    {message}
  </div>
  <div class="jse-actions">
    {#each actions as action}
      <button
        type="button"
        on:click={action.onClick}
        class="jse-button jse-action jse-primary"
        title={action.title}
        disabled={action.disabled}
      >
        {#if action.icon}
          <Icon data={action.icon} />
        {/if}
        {action.text}
      </button>
    {/each}
  </div>
</div>

<style src="./Message.scss"></style>
