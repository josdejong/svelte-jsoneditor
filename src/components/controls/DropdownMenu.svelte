<svelte:options immutable={true} />

<script>
  import Icon from 'svelte-awesome'
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import { onDestroy, onMount } from 'svelte'
  import { keyComboFromEvent } from '../../utils/keyBindings.js'

  /** @type {MenuDropdownItem[]} */
  export let items = []

  export let title = null
  export let width = '120px'
  export let visible = false

  function toggleShow (event) {
    event.stopPropagation()
    visible = !visible
  }

  function handleClick () {
    visible = false
  }

  function handleKeyDown (event) {
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

<div class="menu-dropdown" title={title} on:click={handleClick}>
  <slot name="defaultItem"></slot>

  <button class="open-dropdown" on:click={toggleShow}>
    <Icon data={faCaretDown} />
  </button>

  <div class="items" class:visible style="width: {width};">
    <ul>
      {#each items as item}
        <li>
          <button
            on:click={() => item.onClick()}
            title={item.title}
            disabled={item.disabled}
          >
            {item.text}
          </button>
        </li>
      {/each}
      </ul>
  </div>
</div>

<style src="./DropdownMenu.scss"></style>
