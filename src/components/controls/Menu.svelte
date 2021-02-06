<script>
  import DropdownMenu from './DropdownMenu.svelte'
  import Icon from 'svelte-awesome'

  export let items = []
</script>

<div class="menu">
  <slot name="left" />

  {#each items as item}
    {#if item.separator === true}
      <div class="separator"></div>
    {:else if item.space === true}
      <div class="space"></div>
    {:else if item.items}
      <DropdownMenu
        items={item.items}
        title={item.title}
      >
        <button
          class="button {item.className}"
          slot="defaultItem"
          on:click={() => item.onClick()}
          disabled={item.disabled}
        >
          <Icon data={item.icon} />
        </button>
      </DropdownMenu>
    {:else}
      <button
        class="button {item.className}"
        on:click={() => item.onClick()}
        title={item.title}
        disabled={item.disabled || false}
      >
        <Icon data={item.icon} />
      </button>
    {/if}
  {/each}

  <slot name="right" />
</div>

<style src="./Menu.scss"></style>
