<svelte:options immutable={true} />

<script lang="ts">
  import {
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { faJSONEditorCompact, faJSONEditorFormat } from '$lib/img/customFontawesomeIcons'
  import Menu from '../../../controls/Menu.svelte'
  import type { MenuItem, OnRenderMenuWithoutContext } from '$lib/types'

  export let readOnly = false
  export let onFormat
  export let onCompact
  export let onSort
  export let onTransform
  export let onToggleSearch
  export let onUndo
  export let onRedo
  export let canUndo
  export let canRedo
  export let canFormat
  export let canCompact
  export let canSort
  export let canTransform
  export let onRenderMenu: OnRenderMenuWithoutContext

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
        {
          type: 'button',
          icon: faSearch,
          title: 'Search (Ctrl+F)',
          className: 'jse-search',
          onClick: onToggleSearch
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
        {
          type: 'space'
        }
      ]

  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
