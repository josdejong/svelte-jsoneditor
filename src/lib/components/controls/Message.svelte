<script>
  import Icon from 'svelte-awesome'

  export let type = 'success' // 'success' or 'error'
  export let icon = null
  export let message = null
  export let actions = []
</script>

<div class="message {type}">
  <div class="text">
    {#if icon}
      <Icon data={icon} />
    {/if}
    {message}
  </div>
  <div class="actions">
    {#each actions as action}
      <button
        type="button"
        on:click={action.onClick}
        class="button action primary"
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
