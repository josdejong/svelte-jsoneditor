<svelte:options immutable={true} />

<script lang="ts">
  import { initial, isEqual } from 'lodash-es'
  import {
    createKeySelection,
    createValueSelection,
    isEditingSelection,
    isKeySelection
  } from '$lib/logic/selection.js'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import type { ExtendedSearchResultItem, JSONSelection, TreeModeContext } from '$lib/types.js'
  import { UpdateSelectionAfterChange } from '$lib/types.js'
  import { parseJSONPointer, type JSONPath, type JSONPointer } from 'immutable-json-patch'
  import ContextMenuPointer from '../../../components/controls/contextmenu/ContextMenuPointer.svelte'
  import { classnames } from '$lib/utils/cssUtils.js'

  export let pointer: JSONPointer
  export let key: string
  export let selection: JSONSelection | null
  export let searchResultItems: ExtendedSearchResultItem[] | undefined
  export let onUpdateKey: (oldKey: string, newKey: string) => string

  export let context: TreeModeContext

  let path: JSONPath
  $: path = parseJSONPointer(pointer)

  $: isKeySelected = selection ? isKeySelection(selection) && isEqual(selection.path, path) : false
  $: isEditingKey = isKeySelected && isEditingSelection(selection)

  function handleKeyDoubleClick(
    event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
  ) {
    if (!isEditingKey && !context.readOnly) {
      event.preventDefault()
      context.onSelect(createKeySelection(path, true))
    }
  }

  function getKeyClass(key: string) {
    return classnames('jse-key', {
      'jse-empty': key === ''
    })
  }

  function handleChangeValue(newKey: string, updateSelection: UpdateSelectionAfterChange) {
    const updatedKey = onUpdateKey(key, context.normalization.unescapeValue(newKey))
    const updatedPath = initial(path).concat(updatedKey)

    context.onSelect(
      updateSelection === UpdateSelectionAfterChange.nextInside
        ? createValueSelection(updatedPath, false)
        : createKeySelection(updatedPath, false)
    )

    if (updateSelection !== UpdateSelectionAfterChange.self) {
      context.focus()
    }
  }

  function handleCancelChange() {
    context.onSelect(createKeySelection(path, false))
    context.focus()
  }
</script>

{#if !context.readOnly && isEditingKey}
  <EditableDiv
    value={context.normalization.escapeValue(key)}
    shortText
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
    onFind={context.onFind}
  />
{:else}
  <div
    role="none"
    data-type="selectable-key"
    class={getKeyClass(key)}
    on:dblclick={handleKeyDoubleClick}
  >
    {#if searchResultItems}
      <SearchResultHighlighter text={context.normalization.escapeValue(key)} {searchResultItems} />
    {:else}
      {addNewLineSuffix(context.normalization.escapeValue(key))}
    {/if}
  </div>
{/if}
{#if !context.readOnly && isKeySelected && !isEditingKey}
  <ContextMenuPointer selected={true} onContextMenu={context.onContextMenu} />
{/if}

<style src="./JSONKey.scss"></style>
