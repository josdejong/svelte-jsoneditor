<svelte:options immutable={true} />

<script lang="ts">
  import {
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import {
    faJSONEditorCollapse,
    faJSONEditorCompact,
    faJSONEditorExpand,
    faJSONEditorFormat
  } from '$lib/img/customFontawesomeIcons.js'
  import Menu from '../../../controls/Menu.svelte'
  import type { MenuItem, OnRenderMenuInternal } from '$lib/types'
  import { t } from '$lib/i18n'

  export let readOnly = false
  export let onExpandAll: () => void
  export let onCollapseAll: () => void
  export let onFormat: () => boolean
  export let onCompact: () => boolean
  export let onSort: () => void
  export let onTransform: () => void
  export let onToggleSearch: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let canExpandAll: boolean
  export let canCollapseAll: boolean
  export let canUndo: boolean
  export let canRedo: boolean
  export let canFormat: boolean
  export let canCompact: boolean
  export let canSort: boolean
  export let canTransform: boolean
  export let onRenderMenu: OnRenderMenuInternal

  let expandMenuItem: MenuItem
  $: expandMenuItem = {
    type: 'button',
    icon: faJSONEditorExpand,
    title: t('expandAll'),
    className: 'jse-expand-all',
    onClick: onExpandAll,
    disabled: !canExpandAll
  }

  let collapseMenuItem: MenuItem
  $: collapseMenuItem = {
    type: 'button',
    icon: faJSONEditorCollapse,
    title: t('collapseAll'),
    className: 'jse-collapse-all',
    onClick: onCollapseAll,
    disabled: !canCollapseAll
  }

  const searchItem: MenuItem = {
    type: 'button',
    icon: faSearch,
    title: t('searchCtrlF'),
    className: 'jse-search',
    onClick: onToggleSearch
  }

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        expandMenuItem,
        collapseMenuItem,
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faJSONEditorFormat,
          title: t('formatJson') + ' (Ctrl+I)',
          className: 'jse-format',
          onClick: onFormat,
          disabled: readOnly || !canFormat
        },
        {
          type: 'button',
          icon: faJSONEditorCompact,
          title: t('compactJson') + ' (Ctrl+Shift+I)',
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
          title: t('sort'),
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || !canSort
        },
        {
          type: 'button',
          icon: faFilter,
          title: t('transformContents'),
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
          title: t('undo') + ' (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !canUndo
        },
        {
          type: 'button',
          icon: faRedo,
          title: t('redo') + ' (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !canRedo
        },
        {
          type: 'space'
        }
      ]
    : [
        expandMenuItem,
        collapseMenuItem,
        {
          type: 'separator'
        },
        searchItem,
        {
          type: 'space'
        }
      ]

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore reactive_declaration_non_reactive_property
  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
