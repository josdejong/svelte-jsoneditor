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
  import { CONTEXT_MENU_EXPLANATION } from '$lib/constants.js'
  import { faJSONEditorCollapse, faJSONEditorExpand } from '$lib/img/customFontawesomeIcons.js'
  import { isObjectOrArray } from '$lib/utils/typeUtils.js'
  import Menu from '../../../controls/Menu.svelte'
  import type { JSONSelection, MenuItem, OnRenderMenuWithoutContext } from '$lib/types'
  import type { JSONValue } from 'immutable-json-patch'
  import { isKeySelection, isMultiSelection, isValueSelection } from '$lib/logic/selection.js'
  import type { HistoryState } from '$lib/logic/history.js'

  export let json: JSONValue
  export let selection: JSONSelection | null

  export let readOnly: boolean
  export let showSearch = false
  export let historyState: HistoryState

  export let onExpandAll: () => void
  export let onCollapseAll: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onSort: () => void
  export let onTransform: () => void
  export let onContextMenu: () => void
  export let onCopy: () => void
  export let onRenderMenu: OnRenderMenuWithoutContext

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
    title: 'Expand all',
    className: 'jse-expand-all',
    onClick: onExpandAll,
    disabled: !isObjectOrArray(json)
  }

  let collapseMenuItem: MenuItem
  $: collapseMenuItem = {
    type: 'button',
    icon: faJSONEditorCollapse,
    title: 'Collapse all',
    className: 'jse-collapse-all',
    onClick: onCollapseAll,
    disabled: !isObjectOrArray(json)
  }

  let searchMenuItem: MenuItem
  $: searchMenuItem = {
    type: 'button',
    icon: faSearch,
    title: 'Search (Ctrl+F)',
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
        searchMenuItem,
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
        expandMenuItem,
        collapseMenuItem,
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faCopy,
          title: 'Copy (Ctrl+C)',
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

  $: items = onRenderMenu(defaultItems) || defaultItems
</script>

<Menu {items} />
