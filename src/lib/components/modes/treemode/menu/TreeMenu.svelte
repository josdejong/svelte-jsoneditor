<svelte:options immutable={true} />

<script lang="ts">
  import {
    faCopy,
    faEllipsisV,
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { faJSONEditorCollapse, faJSONEditorExpand } from '$lib/img/customFontawesomeIcons.js'
  import { isObjectOrArray } from '$lib/utils/typeUtils.js'
  import Menu from '../../../controls/Menu.svelte'
  import type {
    HistoryItem,
    History,
    JSONSelection,
    MenuItem,
    OnRenderMenuInternal
  } from '$lib/types'
  import { isKeySelection, isMultiSelection, isValueSelection } from '$lib/logic/selection.js'
  import { t } from '$lib/i18n/index.js'

  export let json: unknown
  export let selection: JSONSelection | undefined

  export let readOnly: boolean
  export let showSearch = false
  export let history: History<HistoryItem>

  export let onExpandAll: () => void
  export let onCollapseAll: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onSort: () => void
  export let onTransform: () => void
  export let onContextMenu: (event: MouseEvent) => void
  export let onCopy: () => void
  export let onRenderMenu: OnRenderMenuInternal

  function handleToggleSearch() {
    showSearch = !showSearch
  }

  $: hasJson = json !== undefined
  $: hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  let expandMenuItem: MenuItem
  $: expandMenuItem = {
    type: 'button',
    icon: faJSONEditorExpand,
    title: t('expandAll'),
    className: 'jse-expand-all',
    onClick: onExpandAll,
    disabled: !isObjectOrArray(json)
  }

  let collapseMenuItem: MenuItem
  $: collapseMenuItem = {
    type: 'button',
    icon: faJSONEditorCollapse,
    title: t('collapseAll'),
    className: 'jse-collapse-all',
    onClick: onCollapseAll,
    disabled: !isObjectOrArray(json)
  }

  let searchMenuItem: MenuItem
  $: searchMenuItem = {
    type: 'button',
    icon: faSearch,
    title: t('searchCtrlF'),
    className: 'jse-search',
    onClick: handleToggleSearch,
    disabled: json === undefined
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
          icon: faSortAmountDownAlt,
          title: t('sort'),
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || json === undefined
        },
        {
          type: 'button',
          icon: faFilter,
          title: t('transformContents'),
          className: 'jse-transform',
          onClick: onTransform,
          disabled: readOnly || json === undefined
        },
        searchMenuItem,
        {
          type: 'button',
          icon: faEllipsisV,
          title: t('contextMenuExplanation'),
          className: 'jse-contextmenu',
          onClick: onContextMenu
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faUndo,
          title: t('undo') + ' (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !history.canUndo
        },
        {
          type: 'button',
          icon: faRedo,
          title: t('redo') + ' (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !history.canRedo
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
        {
          type: 'button',
          icon: faCopy,
          title: t('copy') + ' (Ctrl+C)',
          className: 'jse-copy',
          onClick: onCopy,
          disabled: !hasSelectionContents
        },
        {
          type: 'separator'
        },
        searchMenuItem,
        {
          type: 'space'
        }
      ]

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore reactive_declaration_non_reactive_property
  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
