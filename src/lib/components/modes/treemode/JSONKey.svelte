<svelte:options immutable={true} />

<script lang="ts">
  import classnames from 'classnames'
  import { initial, isEmpty, isEqual } from 'lodash-es'
  import {
    createKeySelection,
    createValueSelection,
    isEditingSelection
  } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import { UPDATE_SELECTION } from '$lib/constants'
  import type { Path, SearchResultItem, TreeModeContext } from '$lib/types'
  import { SearchField } from '$lib/types'
  import { isKeySelection } from '../../../logic/selection.js'
  import ContextMenuButton from './contextmenu/ContextMenuButton.svelte'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { onDestroy } from 'svelte'

  export let path: Path
  export let key: string
  export let onUpdateKey: (oldKey: string, newKey: string) => string

  export let context: TreeModeContext

  $: pointer = compileJSONPointer(path)

  let isSelected = false
  let isEditingKey = false
  let searchResultItems: SearchResultItem[] | undefined = undefined

  const unsubscribe = context.documentStateStore.subscribe((state) => {
    // search results
    const items: SearchResultItem[] = state.searchResult?.itemsMap[pointer]?.filter(
      (item: SearchResultItem) => item.field === SearchField.key
    )
    const nonEmptyItems = !isEmpty(items) ? items : undefined
    if (!isEqual(nonEmptyItems, searchResultItems)) {
      searchResultItems = nonEmptyItems
    }

    // selection
    const selection = state.selectionMap[pointer]
    const selected = isKeySelection(selection)
    if (isSelected !== selected) {
      isSelected = selected
    }

    // editing
    const editingKey = !context.readOnly && isSelected && isEditingSelection(selection)
    if (isEditingKey !== editingKey) {
      isEditingKey = editingKey
    }
  })

  onDestroy(() => {
    unsubscribe()
  })

  function handleKeyDoubleClick(event) {
    if (!isEditingKey && !context.readOnly) {
      event.preventDefault()
      context.onSelect(createKeySelection(path, true))
    }
  }

  function getKeyClass(key) {
    return classnames('jse-key', {
      'jse-empty': key === ''
    })
  }

  function handleChangeValue(newKey, updateSelection) {
    const updatedKey = onUpdateKey(key, context.normalization.unescapeValue(newKey))
    const updatedPath = initial(path).concat(updatedKey)

    if (updateSelection === UPDATE_SELECTION.NEXT_INSIDE) {
      context.onSelect(createValueSelection(updatedPath, false))
    }

    if (updateSelection === UPDATE_SELECTION.SELF) {
      context.onSelect(createKeySelection(path, false), { ensureFocus: false })
    }
  }

  function handleCancelChange() {
    context.onSelect(createKeySelection(path, false))
  }
</script>

{#if isEditingKey}
  <EditableDiv
    value={context.normalization.escapeValue(key)}
    shortText
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
    onFind={context.onFind}
  />
{:else}
  <div data-type="selectable-key" class={getKeyClass(key)} on:dblclick={handleKeyDoubleClick}>
    {#if searchResultItems}
      <SearchResultHighlighter text={context.normalization.escapeValue(key)} {searchResultItems} />
    {:else}
      {addNewLineSuffix(context.normalization.escapeValue(key))}
    {/if}
  </div>
{/if}
{#if !context.readOnly && isSelected}
  <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
{/if}

<style src="./JSONKey.scss"></style>
