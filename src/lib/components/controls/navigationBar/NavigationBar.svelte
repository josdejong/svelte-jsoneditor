<svelte:options immutable={true} />

<script>
  import { getIn } from 'immutable-json-patch'
  import { range } from 'lodash-es'
  import { isObject, isObjectOrArray } from '../../../utils/typeUtils'
  import { STATE_KEYS } from '../../../constants'
  import { createSelection, SELECTION_TYPE } from '../../../logic/selection'
  import createDebug from 'debug'
  import NavigationBarItem from '../../../components/controls/navigationBar/NavigationBarItem.svelte'
  import { caseInsensitiveNaturalCompare } from '../../../logic/sort'

  const debug = createDebug('jsoneditor:NavigationBar')

  export let json
  export let state

  /** @type {Selection | undefined} */
  export let selection

  export let onSelect

  let refNavigationBar

  $: path = selection ? selection.focusPath : []
  $: hasNextItem = isObjectOrArray(getIn(json, path))

  function scrollToLastItem() {
    setTimeout(() => {
      const lastItem = refNavigationBar && refNavigationBar.querySelector('div:last-child')
      // console.log('lastItem', lastItem)
      if (lastItem && lastItem.scrollIntoView) {
        debug('scroll to lastItem', path)
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }

  // trigger scrollToLastItem when path changes
  $: scrollToLastItem(path)

  function getItems(path) {
    debug('get items for path', path)

    const node = getIn(json, path)
    if (Array.isArray(node)) {
      return range(0, node.length)
    } else if (isObject(node)) {
      const keys = getIn(state, path.concat(STATE_KEYS)) || Object.keys(node)

      const sortedKeys = keys.slice(0)
      sortedKeys.sort(caseInsensitiveNaturalCompare)

      return sortedKeys
    } else {
      // never happens but just for robustness...
      return []
    }
  }

  function handleSelect(path) {
    debug('select path', JSON.stringify(path))

    const newSelection = createSelection(json, state, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: path,
      focusPath: path
    })

    onSelect(newSelection)
  }
</script>

<div class="jse-navigation-bar" bind:this={refNavigationBar}>
  {#each path as item, index (index)}
    <NavigationBarItem {getItems} {path} {index} onSelect={handleSelect} />
  {/each}
  {#if hasNextItem}
    <NavigationBarItem {getItems} {path} index={undefined} onSelect={handleSelect} />
  {/if}
  {#if !isObjectOrArray(json)}
    <div class="jse-navigation-bar-empty">Navigation bar</div>
  {/if}
</div>

<style src="./NavigationBar.scss"></style>
