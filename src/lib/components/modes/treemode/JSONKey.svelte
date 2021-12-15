<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { initial } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'
  import { escapeHTML } from '$lib/utils/domUtils.js'

  export let path
  export let key
  export let readOnly
  export let onUpdateKey
  export let selection
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

  function handleChangeValue(newKey, passiveExit = false) {
    const updatedKey = onUpdateKey(key, newKey)
    const updatedPath = initial(path).concat(updatedKey)

    onSelect({
      type: SELECTION_TYPE.KEY,
      path: updatedPath,
      next: !passiveExit
    })
  }

  function handleCancelChange() {
    onSelect({ type: SELECTION_TYPE.KEY, path })
  }
</script>

{#if editKey}
  <EditableDiv value={key} onChange={handleChangeValue} onCancel={handleCancelChange} />
{:else}
  <div data-type="selectable-key" class={getKeyClass(key)} on:dblclick={handleKeyDoubleClick}>
    {#if searchResult}
      <SearchResultHighlighter text={key} {searchResult} />
    {:else}
      {escapeHTML(key)}
    {/if}
  </div>
{/if}

<style src="./JSONKey.scss"></style>
