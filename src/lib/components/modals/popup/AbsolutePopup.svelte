<svelte:options immutable={true} />

<script lang="ts">
  import { createDebug } from '../../../utils/debug'
  import { setContext } from 'svelte'
  import type { PopupEntry } from '../../../types'
  import { uniqueId } from '../../../utils/uniqueId'
  import AbsolutePopupEntry from './AbsolutePopupEntry.svelte'

  const debug = createDebug('jsoneditor:AbsolutePopup')

  let popups: PopupEntry[] = []

  function openAbsolutePopup(component, props, options): number {
    debug('open...', props, options)

    const popup = {
      id: uniqueId(),
      component: component,
      props: props || {},
      options: options || {}
    }

    popups = [...popups, popup]

    return popup.id
  }

  function closeAbsolutePopup(popupId: number | undefined) {
    const popupIndex = popups.findIndex((popup) => popup.id === popupId)

    if (popupIndex !== -1) {
      const popup = popups[popupIndex]
      if (popup.options.onClose) {
        popup.options.onClose()
      }

      popups = popups.filter((popup) => popup.id !== popupId)
    }
  }

  $: debug('popups', popups)

  setContext('absolute-popup', { openAbsolutePopup, closeAbsolutePopup })
</script>

{#each popups as popup}
  <AbsolutePopupEntry {popup} {closeAbsolutePopup} />
{/each}

<slot />
