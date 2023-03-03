<svelte:options immutable={true} />

<script lang="ts">
  import type { MenuItem, OnRenderMenuWithoutContext } from '$lib/types'
  import Menu from '../../../controls/Menu.svelte'
  import {
    faEllipsisV,
    faFilter,
    faRedo,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import type { JSONValue } from 'immutable-json-patch'
  import type { HistoryState } from '$lib/logic/history'
  import { CONTEXT_MENU_EXPLANATION } from '$lib/constants.js'

  export let json: JSONValue | undefined
  export let readOnly: boolean
  export let historyState: HistoryState
  export let onSort: () => void
  export let onTransform: () => void
  export let onContextMenu: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onRenderMenu: OnRenderMenuWithoutContext

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        {
          type: 'button',
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || json === undefined
        },
        {
          type: 'button',
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'jse-transform',
          onClick: onTransform,
          disabled: readOnly || json === undefined
        },
        {
          type: 'button',
          icon: faEllipsisV,
          title: CONTEXT_MENU_EXPLANATION,
          className: 'jse-contextmenu',
          onClick: onContextMenu
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !historyState.canUndo
        },
        {
          type: 'button',
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !historyState.canRedo
        },
        {
          type: 'space'
        }
      ]
    : [
        {
          type: 'space'
        }
      ]

  let items: MenuItem[]
  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
