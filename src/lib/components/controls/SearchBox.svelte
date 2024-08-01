<svelte:options immutable={true} />

<script lang="ts">
  import { debounce } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    faCaretDown,
    faCaretRight,
    faChevronDown,
    faChevronUp,
    faCircleNotch,
    faSearch,
    faTimes
  } from '@fortawesome/free-solid-svg-icons'
  import { DEBOUNCE_DELAY, MAX_SEARCH_RESULTS } from '$lib/constants.js'
  import { keyComboFromEvent } from '$lib/utils/keyBindings.js'
  import { createDebug } from '$lib/utils/debug.js'
  import type { DocumentState, JSONParser, OnPatch, SearchResultDetails } from '$lib/types.js'
  import {
    createSearchAndReplaceAllOperations,
    createSearchAndReplaceOperations,
    search,
    searchNext,
    searchPrevious,
    updateSearchResult
  } from '$lib/logic/search.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { tick } from 'svelte'

  const debug = createDebug('jsoneditor:SearchBox')

  export let json: unknown
  export let documentState: DocumentState | undefined
  export let parser: JSONParser
  export let showSearch: boolean
  export let showReplace: boolean
  export let readOnly: boolean
  export let columns: JSONPath[] | undefined
  export let onSearch: (result: SearchResultDetails | undefined) => void
  export let onFocus: (path: JSONPath) => Promise<void>
  export let onPatch: OnPatch
  export let onClose: () => void

  let text = ''
  let appliedText = ''
  let replaceText = ''
  let searching = false
  let searchResult: SearchResultDetails | undefined

  $: resultCount = searchResult?.items?.length || 0
  $: activeIndex = searchResult?.activeIndex || 0
  $: formattedResultCount =
    resultCount >= MAX_SEARCH_RESULTS ? `${MAX_SEARCH_RESULTS - 1}+` : String(resultCount)

  $: onSearch(searchResult)

  $: applyChangedShowSearch(showSearch)

  const applyChangedSearchTextDebounced = debounce(applyChangedSearchText, DEBOUNCE_DELAY)
  $: applyChangedSearchTextDebounced(text)

  const applyChangedJsonDebounced = debounce(applyChangedJson, DEBOUNCE_DELAY)
  $: applyChangedJsonDebounced(json)

  function toggleShowReplace() {
    showReplace = !showReplace && !readOnly
  }

  function handleKeyDown(event: KeyboardEvent) {
    // key events must not be handled by the generic keydown handler of the
    // whole JSONEditor.
    event.stopPropagation()
    const combo = keyComboFromEvent(event)

    if (combo === 'Enter') {
      event.preventDefault()

      const pendingChanges = text !== appliedText
      if (pendingChanges) {
        applyChangedSearchTextDebounced.flush()
      } else {
        handleNext()
      }
    }

    if (combo === 'Shift+Enter') {
      event.preventDefault()
      handlePrevious()
    }

    if (combo === 'Ctrl+Enter') {
      event.preventDefault()

      if (showReplace) {
        handleReplace()
      } else {
        handleNext()
        // TODO: move focus to the active element so you can start editing?
      }
    }

    if (combo === 'Ctrl+H') {
      event.preventDefault()
      toggleShowReplace()
    }

    if (combo === 'Escape') {
      event.preventDefault()

      handleClose()
    }
  }

  function handleReplaceKeyDown(event: KeyboardEvent) {
    const combo = keyComboFromEvent(event)

    if (combo === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      handleReplace()
    }
  }

  async function handlePaste() {
    await tick()
    setTimeout(() => applyChangedSearchTextDebounced.flush())
  }

  async function handleReplace() {
    if (readOnly) {
      return
    }

    const activeItem = searchResult?.activeItem
    debug('handleReplace', { replaceText, activeItem })

    if (!searchResult || !activeItem || json === undefined) {
      return
    }

    // move to the next search result *before* applying the replacement
    searchResult = {
      ...searchNext(searchResult),
      activeIndex // trick to prevent shortly flickering of index from 1 to 2 and then to 1 again after the next search
    }

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      documentState,
      replaceText,
      activeItem,
      parser
    )

    onPatch(operations, (_, patchedState) => ({
      state: patchedState,
      selection: newSelection
    }))

    // immediately trigger updating the search results
    await tick()
    await applyChangedJsonDebounced.flush()

    // focus to the next search result
    await handleFocus()
  }

  async function handleReplaceAll() {
    if (readOnly) {
      return
    }

    debug('handleReplaceAll', { text, replaceText })

    const { operations, newSelection } = createSearchAndReplaceAllOperations(
      json,
      documentState,
      text,
      replaceText,
      parser
    )

    onPatch(operations, (_, patchedState) => ({
      state: patchedState,
      selection: newSelection
    }))

    await handleFocus()
  }

  function initSearchInput(element: HTMLInputElement) {
    element.select()
  }

  async function handleNext() {
    searchResult = searchResult ? searchNext(searchResult) : undefined

    await handleFocus()
  }

  async function handlePrevious() {
    searchResult = searchResult ? searchPrevious(searchResult) : undefined

    await handleFocus()
  }

  async function handleFocus() {
    debug('handleFocus', searchResult)

    const activeItem = searchResult?.activeItem
    if (activeItem && json !== undefined) {
      await onFocus(activeItem.path)
    }
  }

  async function applyChangedShowSearch(showSearch: boolean) {
    await applySearch(showSearch, text, json)
  }

  async function applyChangedSearchText(text: string) {
    await applySearch(showSearch, text, json)
    await handleFocus()
  }

  async function applyChangedJson(json: unknown) {
    await applySearch(showSearch, text, json)
  }

  // we pass searchText and json as argument to trigger search when these variables change,
  // via various listeners like applyChangedSearchText
  async function applySearch(showSearch: boolean, text: string, json: unknown): Promise<void> {
    if (!showSearch) {
      if (searchResult) {
        searchResult = undefined
      }

      return Promise.resolve()
    }

    debug('applySearch', { showSearch, text })

    if (text === '') {
      debug('clearing search result')

      if (searchResult !== undefined) {
        searchResult = undefined
      }

      return Promise.resolve()
    }

    appliedText = text
    searching = true

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // wait until the search icon has been rendered
        const newResultItems = search(text, json, { maxResults: MAX_SEARCH_RESULTS, columns })
        searchResult = updateSearchResult(newResultItems, searchResult)

        searching = false
        resolve()
      })
    })
  }

  function handleClose() {
    debug('handleClose')
    applyChangedSearchTextDebounced.cancel()
    applyChangedJsonDebounced.cancel()
    applySearch(false, text, json) // will clear the search results
    onClose()
  }
</script>

{#if showSearch}
  <div class="jse-search-box">
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <form class="jse-search-form" on:keydown={handleKeyDown}>
      {#if !readOnly}
        <button
          type="button"
          class="jse-replace-toggle"
          title="Toggle visibility of replace options (Ctrl+H)"
          on:click={toggleShowReplace}
        >
          <Icon data={showReplace ? faCaretDown : faCaretRight} />
        </button>
      {/if}
      <div class="jse-search-contents">
        <div class="jse-search-section">
          <div class="jse-search-icon">
            {#if searching}
              <Icon data={faCircleNotch} spin />
            {:else}
              <Icon data={faSearch} />
            {/if}
          </div>
          <label class="jse-search-input-label" about="jse-search input">
            <input
              class="jse-search-input"
              title="Enter text to search"
              type="text"
              placeholder="Find"
              bind:value={text}
              use:initSearchInput
              on:paste={handlePaste}
            />
          </label>
          <div class="jse-search-count" class:jse-visible={text !== ''}>
            {activeIndex !== -1 && activeIndex < resultCount
              ? `${activeIndex + 1}/`
              : ''}{formattedResultCount}
          </div>
          <button
            type="button"
            class="jse-search-next"
            title="Go to next search result (Enter)"
            on:click={handleNext}
          >
            <Icon data={faChevronDown} />
          </button>
          <button
            type="button"
            class="jse-search-previous"
            title="Go to previous search result (Shift+Enter)"
            on:click={handlePrevious}
          >
            <Icon data={faChevronUp} />
          </button>
          <button
            type="button"
            class="jse-search-clear"
            title="Close search box (Esc)"
            on:click={handleClose}
          >
            <Icon data={faTimes} />
          </button>
        </div>
        {#if showReplace && !readOnly}
          <div class="jse-replace-section">
            <input
              class="jse-replace-input"
              title="Enter replacement text"
              type="text"
              placeholder="Replace"
              bind:value={replaceText}
              on:keydown={handleReplaceKeyDown}
            />
            <button
              type="button"
              title="Replace current occurrence (Ctrl+Enter)"
              on:click={handleReplace}>Replace</button
            >
            <button type="button" title="Replace all occurrences" on:click={handleReplaceAll}
              >All</button
            >
          </div>
        {/if}
      </div>
    </form>
  </div>
{/if}

<style src="./SearchBox.scss"></style>
