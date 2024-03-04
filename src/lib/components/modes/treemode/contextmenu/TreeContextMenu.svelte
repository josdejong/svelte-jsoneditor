<svelte:options immutable={true} />

<script lang="ts">
  import type { ContextMenuItem } from '$lib/types'
  import ContextMenu from '../../../../components/controls/contextmenu/ContextMenu.svelte'

  export let showTip: boolean
  export let items: ContextMenuItem[]
  export let onCloseContextMenu: () => void
</script>

<ContextMenu
  {items}
  {onCloseContextMenu}
  tip={showTip ? 'Tip: you can open this context menu via right-click or with Ctrl+Q' : undefined}
/>
