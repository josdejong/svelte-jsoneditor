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
  import { CONTEXT_MENU_EXPLANATION } from '$lib/constants'
  import { faJSONEditorCollapse, faJSONEditorExpand } from '$lib/img/customFontawesomeIcons'
  import { isObjectOrArray } from '$lib/utils/typeUtils'
  import Menu from '../../../controls/Menu.svelte'
  import { noop } from 'lodash-es'
  import type { OnRenderMenu, JSONSelection, MenuItem } from '$lib/types'
  import type { JSONValue } from 'immutable-json-patch'
  import { isKeySelection, isMultiSelection, isValueSelection } from '../../../../logic/selection'
  import type { HistoryState } from '../../../../logic/history'

  export let json: JSONValue
  export let selection: JSONSelection | undefined

  export let readOnly: boolean
  export let showSearch = false
  export let historyState: HistoryState

  export let onExpandAll
  export let onCollapseAll
  export let onUndo
  export let onRedo
  export let onSort
  export let onTransform
  export let onContextMenu
  export let onCopy

  export let onRenderMenu: OnRenderMenu = noop

  function handleToggleSearch() {
    showSearch = !showSearch
  }

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  $: expandMenuItem = {
    icon: faJSONEditorExpand,
    title: 'Expand all',
    className: 'jse-expand-all',
    onClick: onExpandAll,
    disabled: !isObjectOrArray(json)
  }

  $: collapseMenuItem = {
    icon: faJSONEditorCollapse,
    title: 'Collapse all',
    className: 'jse-collapse-all',
    onClick: onCollapseAll,
    disabled: !isObjectOrArray(json)
  }
  $: searchMenuItem = {
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
          separator: true
        },
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
        searchMenuItem,
        {
          icon: faEllipsisV,
          title: CONTEXT_MENU_EXPLANATION,
          className: 'jse-contextmenu',
          onClick: onContextMenu
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
        expandMenuItem,
        collapseMenuItem,
        {
          separator: true
        },
        {
          icon: faCopy,
          title: 'Copy (Ctrl+C)',
          className: 'jse-copy',
          onClick: onCopy,
          disabled: !hasSelectionContents
        },
        {
          separator: true
        },
        searchMenuItem,
        {
          space: true
        }
      ]

  $: items = onRenderMenu('tree', defaultItems) || defaultItems
</script>

<Menu {items} />
