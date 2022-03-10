<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { initial } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import { UPDATE_SELECTION } from '../../../constants.js'

  export let path
  export let key
  export let readOnly
  export let onUpdateKey
  export let selection

  /** @type {ValueNormalization} */
  export let normalization

  export let onSelect
  export let searchResult

  $: selectedKey = selection && selection.type === SELECTION_TYPE.KEY
  $: editKey = !readOnly && selectedKey && selection && selection.edit === true

  function handleKeyDoubleClick(event) {
    if (!editKey && !readOnly) {
      event.preventDefault()
      onSelect({ type: SELECTION_TYPE.KEY, path, edit: true })
    }
  }

  function getKeyClass(key) {
    return classnames('key', {
      empty: key === ''
    })
  }

  function handleChangeValue(newKey, updateSelection) {
    const updatedKey = onUpdateKey(key, normalization.unescapeValue(newKey))
    const updatedPath = initial(path).concat(updatedKey)

    if (updateSelection === UPDATE_SELECTION.NEXT_INSIDE) {
      onSelect({
        type: SELECTION_TYPE.KEY,
        path: updatedPath,
        next: true
      })
    }

    if (updateSelection === UPDATE_SELECTION.SELF) {
      onSelect(
        {
          type: SELECTION_TYPE.KEY,
          path: updatedPath
        },
        { ensureFocus: false }
      )
    }
  }

  function handleCancelChange() {
    onSelect({ type: SELECTION_TYPE.KEY, path })
  }
</script>

{#if editKey}
  <EditableDiv
    value={normalization.escapeValue(key)}
    shortText
    onChange={handleChangeValue}
    onCancel={handleCancelChange}
  />
{:else}
  <div data-type="selectable-key" class={getKeyClass(key)} on:dblclick={handleKeyDoubleClick}>
    {#if searchResult}
      <SearchResultHighlighter text={normalization.escapeValue(key)} {searchResult} />
    {:else}
      {addNewLineSuffix(normalization.escapeValue(key))}
    {/if}
  </div>
{/if}

<style src="./JSONKey.scss"></style>
