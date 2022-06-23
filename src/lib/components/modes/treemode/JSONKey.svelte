<svelte:options immutable={true} />

<script lang="ts">
  import classnames from 'classnames'
  import { initial } from 'lodash-es'
  import {
    createKeySelection,
    createValueSelection,
    isEditingSelection
  } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import { UPDATE_SELECTION } from '$lib/constants'
  import type { ExtendedSearchResultItem, JSONPointer, TreeModeContext } from '$lib/types'
  import { type Selection } from '$lib/types'
  import { isKeySelection } from '../../../logic/selection.js'
  import ContextMenuButton from './contextmenu/ContextMenuButton.svelte'
  import { parseJSONPointer } from 'immutable-json-patch'

  export let pointer: JSONPointer
  export let key: string
  export let selection: Selection | undefined
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
      const path = parseJSONPointer(pointer)
      context.onSelect(createKeySelection(path, true))
    }
  }

  function getKeyClass(key) {
    return classnames('jse-key', {
      'jse-empty': key === ''
    })
  }

  function handleChangeValue(newKey, updateSelection) {
    const path = parseJSONPointer(pointer)
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
    const path = parseJSONPointer(pointer)
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
{#if !context.readOnly && isSelected && !isEditingKey}
  <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
{/if}

<style src="./JSONKey.scss"></style>
