<svelte:options immutable={true} />

<script>
  import {
    faClone,
    faCopy,
    faCropAlt,
    faCut,
    faFilter,
    faPaste,
    faPlus,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faTimes,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty } from 'lodash-es'
  import { getContext } from 'svelte'
  import { SIMPLE_MODAL_OPTIONS } from '../../../../constants.js'
  import {
    faJSONEditorCollapse,
    faJSONEditorExpand
  } from '../../../../img/customFontawesomeIcons.js'
  import { SELECTION_TYPE } from '../../../../logic/selection.js'
  import Menu from '../../../controls/Menu.svelte'
  import CopyPasteModal from '../../../modals/CopyPasteModal.svelte'
  import SearchBox from './SearchBox.svelte'

  const {open} = getContext('simple-modal')

  export let readOnly
  export let searchText
  export let searchResult
  export let searching
  export let showSearch = false
  export let selection
  export let historyState

  export let onExpandAll
  export let onCollapseAll
  export let onCut
  export let onCopy
  export let onRemove
  export let onDuplicate
  export let onExtract
  export let onInsert
  export let onUndo
  export let onRedo
  export let onSort
  export let onTransform

  export let onSearchText
  export let onNextSearchResult
  export let onPreviousSearchResult

  export let onFocus
  export let onCreateMenu = () => {}

  $: hasSelection = selection != null
  $: hasSelectionContents = selection != null && (
    selection.type === SELECTION_TYPE.MULTI ||
    selection.type === SELECTION_TYPE.KEY ||
    selection.type === SELECTION_TYPE.VALUE
  )
  $: canDuplicate = selection != null &&
    (selection.type === SELECTION_TYPE.MULTI) &&
    !isEmpty(selection.focusPath) // must not be root
  $: canExtract = selection != null && (
      selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.VALUE
    ) &&
    !isEmpty(selection.focusPath) // must not be root

  function handleToggleSearch() {
    showSearch = !showSearch
  }

  function clearSearchResult() {
    showSearch = false
    onSearchText('')
    setTimeout(onFocus)
  }

  function handleInsertStructure() {
    onInsert('structure')
  }

  function handlePasteFromMenu() {
    open(CopyPasteModal, {}, {
      ...SIMPLE_MODAL_OPTIONS,
      styleWindow: {
        ...SIMPLE_MODAL_OPTIONS.styleWindow,
        width: '450px'
      }
    }, {
      onClose: () => setTimeout(onFocus)
    })
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
      icon: faCut,
      title: 'Cut (Ctrl+X)',
      className: 'cut',
      onClick: onCut,
      disabled: readOnly || !hasSelectionContents
    },
    {
      icon: faCopy,
      title: 'Copy (Ctrl+C)',
      className: 'copy',
      onClick: onCopy,
      disabled: !hasSelectionContents
    },
    {
      icon: faPaste,
      title: 'Paste (Ctrl+V)',
      className: 'paste',
      onClick: handlePasteFromMenu,
      disabled: readOnly || !hasSelection
    },
    {
      separator: true
    },
    {
      icon: faTimes,
      title: 'Remove (Delete)',
      className: 'remove',
      onClick: onRemove,
      disabled: readOnly || !hasSelectionContents
    },
    {
      icon: faClone,
      title: 'Duplicate (Ctrl+D)',
      className: 'duplicate',
      onClick: onDuplicate,
      disabled: readOnly || !canDuplicate
    },
    {
      icon: faCropAlt,
      title: 'Extract',
      className: 'extract',
      onClick: onExtract,
      disabled: readOnly || !canExtract
    },
    {
      icon: faPlus,
      title: 'Insert new structure (Insert)',
      className: 'insert',
      onClick: handleInsertStructure,
      disabled: readOnly || !hasSelection,
      items: [ // type: MenuDropdownItem[]
        {
          text: 'Insert value',
          title: 'Insert a new value',
          onClick: () => onInsert('value'),
          disabled: readOnly || !hasSelection,
          default: true
        },
        {
          text: 'Insert object',
          title: 'Insert a new object',
          onClick: () => onInsert('object'),
          disabled: readOnly || !hasSelection
        },
        {
          text: 'Insert array',
          title: 'Insert a new array',
          onClick: () => onInsert('array'),
          disabled: readOnly || !hasSelection
        },
        {
          text: 'Insert structure',
          title: 'Insert a new item with the same structure as other items. ' +
            'Only applicable inside an array',
          onClick: handleInsertStructure,
          disabled: readOnly || !hasSelection
        }
      ]
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
      icon: faSearch,
      title: 'Search (Ctrl+F)',
      className: 'search',
      onClick: handleToggleSearch
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
    },
  ]

  $: items = onCreateMenu('tree', defaultItems) || defaultItems
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
