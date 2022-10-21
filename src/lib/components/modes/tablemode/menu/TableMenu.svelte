<svelte:options immutable={true} />

<script lang="ts">
  import type { MenuItem, OnRenderMenu } from '../../../../types'
  import Menu from '../../../controls/Menu.svelte'
  import { faFilter, faRedo, faSortAmountDownAlt, faUndo } from '@fortawesome/free-solid-svg-icons'
  import type { JSONValue } from 'immutable-json-patch'
  import type { HistoryState } from '$lib/logic/history'

  export let json: JSONValue | undefined
  export let readOnly: boolean
  export let historyState: HistoryState
  export let onSort: () => void
  export let onTransform: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onRenderMenu: OnRenderMenu

  $: console.log('TableMenu', { readOnly, json })

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        {
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || json === undefined
        },
        {
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'jse-transform',
          onClick: onTransform,
          disabled: readOnly || json === undefined
        },
        {
          separator: true
        },
        {
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !historyState.canUndo
        },
        {
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !historyState.canRedo
        },
        {
          space: true
        }
      ]
    : [
        {
          space: true
        }
      ]

  let items: MenuItem[]
  $: items = onRenderMenu('table', defaultItems) || defaultItems
</script>

<Menu {items} />
