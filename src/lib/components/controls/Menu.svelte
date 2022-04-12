<svelte:options immutable={true} />

<script>
  import Icon from 'svelte-awesome'

  export let items = []
</script>

<div class="jse-menu">
  <slot name="left" />

  {#each items as item}
    {#if item.separator === true}
      <div class="jse-separator" />
    {:else if item.space === true}
      <div class="jse-space" />
    {:else}
      <button
        type="button"
        class="jse-button {item.className}"
        on:click={item.onClick}
        title={item.title}
        disabled={item.disabled || false}
      >
        {#if item.icon}
          <Icon data={item.icon} />
        {/if}
        {#if item.text}
          {item.text}
        {/if}
      </button>
    {/if}
  {/each}

  <slot name="right" />
</div>

<style src="./Menu.scss"></style>
