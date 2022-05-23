<svelte:options immutable={true} />

<script>
  import Icon from 'svelte-awesome'
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import { onDestroy, onMount } from 'svelte'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'

  /** @type {DropdownButtonItem[]} */
  export let items = []
  export let title = null
  export let width = '120px'

  let visible = false

  function toggleShow() {
    const wasVisible = visible

    // trigger *after* the handleClick which changes visibility to false
    setTimeout(() => (visible = !wasVisible))
  }

  function handleClick() {
    visible = false
  }

  function handleKeyDown(event) {
    const combo = keyComboFromEvent(event)
    if (combo === 'Escape') {
      event.preventDefault()
      visible = false
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    document.removeEventListener('click', handleClick)
    document.removeEventListener('keydown', handleKeyDown)
  })
</script>

<div class="jse-dropdown-button" {title} on:click={handleClick}>
  <slot name="defaultItem" />

  <button
    type="button"
    class="jse-open-dropdown"
    data-type="jse-open-dropdown"
    class:jse-visible={visible}
    on:click={toggleShow}
  >
    <Icon data={faCaretDown} />
  </button>

  <div class="jse-dropdown-items" class:jse-visible={visible} style="width: {width};">
    <ul>
      {#each items as item}
        <li>
          <button
            type="button"
            on:click={() => item.onClick()}
            title={item.title}
            disabled={item.disabled}
          >
            {#if item.icon}
              <Icon data={item.icon} />
            {/if}
            {item.text}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style src="./DropdownButton.scss"></style>
