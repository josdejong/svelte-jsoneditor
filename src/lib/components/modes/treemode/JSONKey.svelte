<svelte:options immutable={true} />

<script lang="ts">
  import { initial } from 'lodash-es'
  import {
    createKeySelection,
    createValueSelection,
    isEditingSelection
  } from '$lib/logic/selection.js'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import { UPDATE_SELECTION } from '$lib/constants.js'
  import type { ExtendedSearchResultItem, TreeModeContext } from '$lib/types.js'
  import { type JSONSelection } from '$lib/types.js'
  import type { JSONPath, JSONPointer } from 'immutable-json-patch'
  import { isKeySelection } from '$lib/logic/selection.js'
  import ContextMenuPointer from '../../../components/controls/contextmenu/ContextMenuPointer.svelte'
  import { classnames } from '$lib/utils/cssUtils.js'

  export let path: JSONPath
  export let pointer: JSONPointer
  export let key: string
  export let selection: JSONSelection | undefined
  export let searchResultItems: ExtendedSearchResultItem[] | undefined
  export let onUpdateKey: (oldKey: string, newKey: string) => string

  export let context: TreeModeContext

  $: isSelected = selection
    ? selection.pointersMap[pointer] === true && isKeySelection(selection)
    : undefined
  $: isEditingKey = isSelected && isEditingSelection(selection)

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

    context.onSelect(
      updateSelection === UPDATE_SELECTION.NEXT_INSIDE
        ? createValueSelection(updatedPath, false)
        : createKeySelection(updatedPath, false)
    )

    if (updateSelection !== UPDATE_SELECTION.SELF) {
      context.focus()
    }
  }

  function handleCancelChange() {
    context.onSelect(createKeySelection(path, false))
    context.focus()
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
{#if !context.readOnly && isSelected && !isEditingKey}
  <ContextMenuPointer selected={true} onContextMenu={context.onContextMenu} />
{/if}

<style src="./JSONKey.scss"></style>
