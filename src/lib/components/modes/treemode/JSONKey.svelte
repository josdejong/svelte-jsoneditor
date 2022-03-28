<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { initial } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import { UPDATE_SELECTION } from '../../../constants.js'

  export let path
  export let key
  export let onUpdateKey
  export let selection
  export let searchResult

  /** @type {TreeModeContext} */
  export let context

  $: selectedKey = selection && selection.type === SELECTION_TYPE.KEY
  $: editKey = !context.readOnly && selectedKey && selection && selection.edit === true

  function handleKeyDoubleClick(event) {
    if (!editKey && !context.readOnly) {
      event.preventDefault()
      context.onSelect({ type: SELECTION_TYPE.KEY, path, edit: true })
    }
  }

  function getKeyClass(key) {
    return classnames('key', {
      empty: key === ''
    })
  }

  function handleChangeValue(newKey, updateSelection) {
    const updatedKey = onUpdateKey(key, context.normalization.unescapeValue(newKey))
    const updatedPath = initial(path).concat(updatedKey)

    if (updateSelection === UPDATE_SELECTION.NEXT_INSIDE) {
      context.onSelect({
        type: SELECTION_TYPE.KEY,
        path: updatedPath,
        next: true
      })
    }

    if (updateSelection === UPDATE_SELECTION.SELF) {
      context.onSelect(
        {
          type: SELECTION_TYPE.KEY,
          path: updatedPath
        },
        { ensureFocus: false }
      )
    }
  }

  function handleCancelChange() {
    context.onSelect({ type: SELECTION_TYPE.KEY, path })
  }
</script>

{#if editKey}
  <EditableDiv
    value={context.normalization.escapeValue(key)}
    shortText
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
    onFind={context.onFind}
  />
{:else}
  <div data-type="selectable-key" class={getKeyClass(key)} on:dblclick={handleKeyDoubleClick}>
    {#if searchResult}
      <SearchResultHighlighter text={context.normalization.escapeValue(key)} {searchResult} />
    {:else}
      {addNewLineSuffix(context.normalization.escapeValue(key))}
    {/if}
  </div>
{/if}

<style src="./JSONKey.scss"></style>
