<svelte:options immutable={true} />

<script>
  import {
    faEllipsisV,
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { CONTEXT_MENU_EXPLANATION } from '../../../../constants.js'
  import {
    faJSONEditorCollapse,
    faJSONEditorExpand
  } from '../../../../img/customFontawesomeIcons.js'
  import Menu from '../../../controls/Menu.svelte'
  import SearchBox from './SearchBox.svelte'

  export let readOnly
  export let searchText
  export let searchResult
  export let searching
  export let showSearch = false
  export let historyState

  export let onExpandAll
  export let onCollapseAll
  export let onUndo
  export let onRedo
  export let onSort
  export let onTransform
  export let onContextMenu

  export let onSearchText
  export let onNextSearchResult
  export let onPreviousSearchResult

  export let onFocus
  export let onRenderMenu = () => {}

  function handleToggleSearch () {
    showSearch = !showSearch
  }

  function clearSearchResult () {
    showSearch = false
    onSearchText('')
    setTimeout(onFocus)
  }

  /* @type {MenuItem[]} */
  $: defaultItems = [
    {
      icon: faJSONEditorExpand,
      title: 'Expand all',
      className: 'expand-all',
      onClick: onExpandAll
    },
    {
      icon: faJSONEditorCollapse,
      title: 'Collapse all',
      className: 'collapse-all',
      onClick: onCollapseAll
    },
    {
      separator: true
    },
    {
      icon: faSortAmountDownAlt,
      title: 'Sort',
      className: 'sort',
      onClick: onSort,
      disabled: readOnly
    },
    {
      icon: faFilter,
      title: 'Transform contents (filter, sort, project)',
      className: 'transform',
      onClick: onTransform,
      disabled: readOnly
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
      separator: true
    },
    {
      icon: faSearch,
      title: 'Search (Ctrl+F)',
      className: 'search',
      onClick: handleToggleSearch
    },
    {
      separator: true
    },
    {
      icon: faEllipsisV,
      title: CONTEXT_MENU_EXPLANATION,
      className: 'contextmenu',
      onClick: onContextMenu
    },
    {
      space: true
    }
  ]

  $: items = onRenderMenu('tree', defaultItems) || defaultItems
</script>

<Menu items={items}>
  <div slot="right" class="search-box-container">
    {#if showSearch}
      <SearchBox
        text={searchText}
        resultCount={searchResult ? searchResult.count : 0}
        activeIndex={searchResult ? searchResult.activeIndex : 0}
        searching={searching}
        onChange={onSearchText}
        onNext={onNextSearchResult}
        onPrevious={onPreviousSearchResult}
        onClose={clearSearchResult}
      />
    {/if}
  </div>
</Menu>

<style src="./TreeMenu.scss"></style>
