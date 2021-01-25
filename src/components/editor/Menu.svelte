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
  import Icon from 'svelte-awesome'
  import { SIMPLE_MODAL_OPTIONS } from '../../constants.js'
  import {
    faJSONEditorCollapse,
    faJSONEditorExpand
  } from '../../img/customFontawesomeIcons.js'
  import { SELECTION_TYPE } from '../../logic/selection.js'
  import DropdownMenu from '../controls/DropdownMenu.svelte'
  import CopyPasteModal from '../modals/CopyPasteModal.svelte'
  import SearchBox from './SearchBox.svelte'

  const { open } = getContext('simple-modal')

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

  let domPasteFromMenu
  let domSearch

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

  function handleToggleSearch () {
    showSearch = !showSearch
  }

  function clearSearchResult () {
    showSearch = false
    onSearchText('')
    domSearch.focus()
  }

  function handleInsertStructure () {
    onInsert('structure')
  }

  function handlePasteFromMenu () {
    open(CopyPasteModal, {}, {
      ...SIMPLE_MODAL_OPTIONS,
      styleWindow: {
        ...SIMPLE_MODAL_OPTIONS.styleWindow,
        width: '450px'
      }
    }, {
      onClose: () => domPasteFromMenu.focus()
    })
  }

  /** @type {MenuDropdownItem[]} */
  $: insertItems = [
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
</script>

<div class="menu">

  <button
    class="button expand-all"
    on:click={onExpandAll}
    title="Expand all"
  >
    <Icon data={faJSONEditorExpand} />
  </button>
  <button
    class="button collapse-all"
    on:click={onCollapseAll}
    title="Collapse all"
  >
    <Icon data={faJSONEditorCollapse} />
  </button>

  <div class="separator"></div>

  <button
    class="button cut"
    on:click={onCut}
    disabled={readOnly || !hasSelectionContents}
    title="Cut (Ctrl+X)"
  >
    <Icon data={faCut} />
  </button>
  <button
    class="button copy"
    on:click={onCopy}
    disabled={!hasSelectionContents}
    title="Copy (Ctrl+C)"
  >
    <Icon data={faCopy} />
  </button>
  <button
    class="button paste"
    bind:this={domPasteFromMenu}
    on:click={handlePasteFromMenu}
    disabled={readOnly || !hasSelection}
    title="Paste (Ctrl+V)"
  >
    <Icon data={faPaste} />
  </button>

  <div class="separator"></div>

  <button
    class="button remove"
    on:click={onRemove}
    disabled={readOnly || !hasSelectionContents}
    title="Remove (Delete)"
  >
    <Icon data={faTimes} />
  </button>
  <button
    class="button duplicate"
    on:click={onDuplicate}
    disabled={readOnly || !canDuplicate}
    title="Duplicate (Ctrl+D)"
  >
    <Icon data={faClone} />
  </button>
  <button
    class="button extract"
    on:click={onExtract}
    disabled={readOnly || !canExtract}
    title="Extract"
  >
    <Icon data={faCropAlt} />
  </button>
  <DropdownMenu
    items={insertItems}
    title="Insert new structure (Insert)"
  >
    <button
      class="button insert"
      slot="defaultItem"
      on:click={handleInsertStructure}
      disabled={readOnly || !hasSelection}
    >
      <Icon data={faPlus} />
    </button>
  </DropdownMenu>

  <div class="separator"></div>

  <button
    class="button sort"
    disabled={readOnly}
    on:click={onSort}
    title="Sort"
  >
    <Icon data={faSortAmountDownAlt} />
  </button>
  <button
    class="button transform"
    disabled={readOnly}
    on:click={onTransform}
    title="Transform contents (filter, sort, project)"
  >
    <Icon data={faFilter} />
  </button>

  <div class="separator"></div>

  <button
    class="button search"
    bind:this={domSearch}
    on:click={handleToggleSearch}
    title="Search (Ctrl+F)"
  >
    <Icon data={faSearch} />
  </button>

  <div class="separator"></div>

  <button
    class="button undo"
    disabled={!historyState.canUndo}
    on:click={onUndo}
    title="Undo (Ctrl+Z)"
  >
    <Icon data={faUndo} />
  </button>
  <button
    class="button redo"
    disabled={!historyState.canRedo}
    on:click={onRedo}
    title="Redo (Ctrl+Shift+Z)"
  >
    <Icon data={faRedo} />
  </button>

  <div class="space"></div>

  {#if showSearch}
    <div class="search-box-container">
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
    </div>
  {/if}
</div>

<style src="./Menu.scss"></style>
