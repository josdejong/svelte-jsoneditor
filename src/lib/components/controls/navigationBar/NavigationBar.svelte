<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONPath, JSONValue } from 'immutable-json-patch'
  import { existsIn, getIn } from 'immutable-json-patch'
  import { range } from 'lodash-es'
  import { isObject, isObjectOrArray } from '../../../utils/typeUtils'
  import { createMultiSelection } from '../../../logic/selection'
  import { createDebug } from '../../../utils/debug'
  import { caseInsensitiveNaturalCompare } from '../../../logic/sort'
  import type { DocumentState, JSONPathParser, OnError, OnSelect } from '../../../types'
  import Icon from 'svelte-awesome'
  import { faClose, faEdit } from '@fortawesome/free-solid-svg-icons'
  import NavigationBarItem from './NavigationBarItem.svelte'
  import NavigationBarPathEditor from './NavigationBarPathEditor.svelte'

  const debug = createDebug('jsoneditor:NavigationBar')

  export let json: JSONValue
  export let documentState: DocumentState
  export let onSelect: OnSelect
  export let onError: OnError
  export let pathParser: JSONPathParser

  let refNavigationBar: Element | undefined
  let refEditButton: HTMLButtonElement | undefined
  let editing = false

  $: path = documentState.selection ? documentState.selection.focusPath : []
  $: hasNextItem = isObjectOrArray(getIn(json, path))

  function scrollToLastItem(path) {
    setTimeout(() => {
      if (refNavigationBar && refNavigationBar.scrollTo) {
        const left = refNavigationBar.scrollWidth - refNavigationBar.clientWidth
        if (left > 0) {
          debug('scrollTo ', left)
          refNavigationBar.scrollTo({ left, behavior: 'smooth' })
        }
      }
    })
  }

  // trigger scrollToLastItem when path changes
  $: scrollToLastItem(path)

  function getItems(path: JSONPath): string[] {
    debug('get items for path', path)

    const node = getIn(json, path)
    if (Array.isArray(node)) {
      return range(0, node.length).map(String)
    } else if (isObject(node)) {
      const keys = Object.keys(node)

      const sortedKeys = keys.slice(0)
      sortedKeys.sort(caseInsensitiveNaturalCompare)

      return sortedKeys
    } else {
      // never happens but just for robustness...
      return []
    }
  }

  function pathExists(path: JSONPath): boolean {
    return existsIn(json, path)
  }

  function handleSelect(path: JSONPath) {
    debug('select path', JSON.stringify(path))

    onSelect(createMultiSelection(json, path, path))
  }

  function toggleEditing() {
    editing = !editing
  }

  function handleCloseEditor() {
    editing = false
  }

  function handleChangePath(path: JSONPath) {
    handleCloseEditor()
    handleSelect(path)
  }
</script>

<div class="jse-navigation-bar" bind:this={refNavigationBar}>
  {#if !editing}
    {#each path as item, index (index)}
      <NavigationBarItem {getItems} {path} {index} onSelect={handleSelect} />
    {/each}
    {#if hasNextItem}
      <NavigationBarItem {getItems} {path} index={undefined} onSelect={handleSelect} />
    {/if}
  {:else}
    <NavigationBarPathEditor
      {path}
      onClose={handleCloseEditor}
      onChange={handleChangePath}
      {onError}
      {pathExists}
      {pathParser}
    />
  {/if}

  <button
    type="button"
    class="jse-navigation-bar-edit"
    class:flex={!editing}
    class:editing
    title={editing ? 'Cancel editing the selected path' : 'Edit the selected path'}
    on:click={toggleEditing}
    bind:this={refEditButton}
  >
    <span class="jse-navigation-bar-space">
      <!-- ensure the right height (arrows have less height than the text) -->
      {!isObjectOrArray(json) && !editing ? 'Navigation bar' : '\u00A0'}
    </span>

    <Icon data={editing ? faClose : faEdit} />
  </button>
</div>

<style src="./NavigationBar.scss"></style>
