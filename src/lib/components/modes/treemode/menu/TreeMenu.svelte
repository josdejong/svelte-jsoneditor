<svelte:options immutable={true} />

<script>
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
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { isObjectOrArray } from '$lib/utils/typeUtils'
  import Menu from '../../../controls/Menu.svelte'

  export let json
  export let selection

  export let readOnly
  export let showSearch = false
  export let historyState

  export let onExpandAll
  export let onCollapseAll
  export let onUndo
  export let onRedo
  export let onSort
  export let onTransform
  export let onContextMenu
  export let onCopy

  export let onRenderMenu = () => {}

  function handleToggleSearch() {
    showSearch = !showSearch
  }

  $: hasJson = json !== undefined
  $: hasSelection = selection != null
  $: hasSelectionContents =
    hasJson &&
    selection != null &&
    (selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE)

  $: expandMenuItem = {
    icon: faJSONEditorExpand,
    title: 'Expand all',
    className: 'expand-all',
    onClick: onExpandAll,
    disabled: !isObjectOrArray(json)
  }

  $: collapseMenuItem = {
    icon: faJSONEditorCollapse,
    title: 'Collapse all',
    className: 'collapse-all',
    onClick: onCollapseAll,
    disabled: !isObjectOrArray(json)
  }
  $: searchMenuItem = {
    icon: faSearch,
    title: 'Search (Ctrl+F)',
    className: 'search',
    onClick: handleToggleSearch
  }

  /* @type {MenuItem[]} */
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
          className: 'sort',
          onClick: onSort,
          disabled: readOnly || json === undefined
        },
        {
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'transform',
          onClick: onTransform,
          disabled: readOnly || json === undefined
        },
        searchMenuItem,
        {
          icon: faEllipsisV,
          title: CONTEXT_MENU_EXPLANATION,
          className: 'contextmenu',
          onClick: onContextMenu
        },
        {
          separator: true
        },
        {
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'undo',
          onClick: onUndo,
          disabled: !historyState.canUndo
        },
        {
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'redo',
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
          className: 'copy',
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

<style src="./TreeMenu.scss"></style>
