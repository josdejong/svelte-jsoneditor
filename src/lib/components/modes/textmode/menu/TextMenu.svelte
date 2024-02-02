<svelte:options immutable={true} />

<script lang="ts">
  import {
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { faJSONEditorCompact, faJSONEditorFormat } from '$lib/img/customFontawesomeIcons.js'
  import Menu from '../../../controls/Menu.svelte'
  import type { MenuItem, OnRenderMenuInternal } from '$lib/types'

  export let readOnly = false
  export let onFormat: () => boolean
  export let onCompact: () => boolean
  export let onSort: () => void
  export let onTransform: () => void
  export let onToggleSearch: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let canUndo: boolean
  export let canRedo: boolean
  export let canFormat: boolean
  export let canCompact: boolean
  export let canSort: boolean
  export let canTransform: boolean
  export let onRenderMenu: OnRenderMenuInternal

  const searchItem: MenuItem = {
    type: 'button',
    icon: faSearch,
    title: 'Search (Ctrl+F)',
    className: 'jse-search',
    onClick: onToggleSearch
  }

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        {
          type: 'button',
          icon: faJSONEditorFormat,
          title: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
          className: 'jse-format',
          onClick: onFormat,
          disabled: readOnly || !canFormat
        },
        {
          type: 'button',
          icon: faJSONEditorCompact,
          title: 'Compact JSON: remove all white spacing and new lines (Ctrl+Shift+I)',
          className: 'jse-compact',
          onClick: onCompact,
          disabled: readOnly || !canCompact
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || !canSort
        },
        {
          type: 'button',
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'jse-transform',
          onClick: onTransform,
          disabled: readOnly || !canTransform
        },
        searchItem,
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !canUndo
        },
        {
          type: 'button',
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !canRedo
        },
        {
          type: 'space'
        }
      ]
    : [
        searchItem,
        {
          type: 'space'
        }
      ]

  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
