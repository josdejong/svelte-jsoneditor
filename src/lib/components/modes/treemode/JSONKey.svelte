<svelte:options immutable={true} />

<script>
  import classnames from 'classnames'
  import { isEqual } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import SearchResultHighlighter from './highlight/SearchResultHighlighter.svelte'
  import EditableDiv from '../../controls/EditableDiv.svelte'

  export let path
  export let key
  export let readOnly
  export let onUpdateKey
  export let selection
  export let onSelect
  export let searchResult

  $: selectedKey =
    selection && selection.type === SELECTION_TYPE.KEY ? isEqual(selection.focusPath, path) : false
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

  function handleChangeValue(newKey) {
    onUpdateKey(key, newKey)

    onSelect({ type: SELECTION_TYPE.KEY, path, next: true })
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
      {key}
    {/if}
  </div>
{/if}

<style src="./JSONKey.scss"></style>
