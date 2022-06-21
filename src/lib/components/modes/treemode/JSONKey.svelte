<svelte:options immutable={true} />

<script lang="ts">
  import classnames from 'classnames'
  import { initial, isEmpty } from 'lodash-es'
  import { createKeySelection, createValueSelection } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import { UPDATE_SELECTION } from '$lib/constants'
  import type { DocumentState, Path, SearchResultItem, TreeModeContext } from '$lib/types'
  import { SearchField } from '$lib/types'
  import { derived } from 'svelte/store'
  import { isKeySelection } from '../../../logic/selection.js'
  import ContextMenuButton from './contextmenu/ContextMenuButton.svelte'
  import { compileJSONPointer } from 'immutable-json-patch'

  export let path: Path
  export let key: string
  export let onUpdateKey: (oldKey: string, newKey: string) => string

  export let context: TreeModeContext

  $: pointer = compileJSONPointer(path)
  $: selection = derived(context.documentStateStore, (state) => state.selectionMap[pointer])
  $: isEditingKey = derived(selection, ($selection) => {
    const selectedKey = isKeySelection($selection)
    return !context.readOnly && selectedKey && $selection && $selection['edit'] === true
  })

  $: searchResultItems = derived(context.documentStateStore, (state: DocumentState) => {
    const items: SearchResultItem[] = state.searchResult?.itemsMap[pointer]?.filter(
      (item: SearchResultItem) => item.field === SearchField.key
    )

    return !isEmpty(items) ? items : undefined
  })

  function handleKeyDoubleClick(event) {
    if (!$isEditingKey && !context.readOnly) {
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

{#if $isEditingKey}
  <EditableDiv
    value={context.normalization.escapeValue(key)}
    shortText
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
    onFind={context.onFind}
  />
{:else}
  <div data-type="selectable-key" class={getKeyClass(key)} on:dblclick={handleKeyDoubleClick}>
    {#if $searchResultItems}
      <SearchResultHighlighter
        text={context.normalization.escapeValue(key)}
        searchResultItems={$searchResultItems}
      />
    {:else}
      {addNewLineSuffix(context.normalization.escapeValue(key))}
    {/if}
  </div>
{/if}
{#if !context.readOnly && isKeySelection($selection)}
  <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
{/if}

<style src="./JSONKey.scss"></style>
