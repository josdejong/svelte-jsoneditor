<script>
  import classnames from 'classnames'
  import { isEqual } from 'lodash-es'
  import { onDestroy, tick } from 'svelte'
  import {
    ACTIVE_SEARCH_RESULT,
    STATE_SEARCH_PROPERTY
  } from '../../constants.js'
  import { SELECTION_TYPE } from '../../logic/selection.js'
  import {
    getPlainText,
    setCursorToEnd,
    setPlainText
  } from '../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../utils/keyBindings.js'

  export let path
  export let key
  export let readOnly
  export let onUpdateKey
  export let selection
  export let onSelect
  export let searchResult

  onDestroy(() => {
    updateKey()
  })

  let domKey
  let newKey = key
  let keyClass

  $: selectedKey = (selection && selection.type === SELECTION_TYPE.KEY)
    ? isEqual(selection.focusPath, path)
    : false
  $: editKey = selectedKey && selection && selection.edit === true
  $: keyClass = getKeyClass(newKey, searchResult)

  $: if (editKey === true) {
    // edit changed to true -> set focus to end of input
    focusKey()
  }

  $: if (domKey) {
    setDomKey(key)
  }

  $: if (editKey === false) {
    updateKey()
  }

  function updateKey () {
    if (key !== newKey) {
      // must be handled by the parent which has knowledge about the other keys
      const uniqueKey = onUpdateKey(key, newKey)
      if (uniqueKey !== newKey) {
        setDomKey(uniqueKey)
      }
    }
  }

  function getDomKey () {
    if (!domKey) {
      return key
    }

    return getPlainText(domKey)
  }

  function setDomKey (updatedKey) {
    if (domKey) {
      newKey = updatedKey
      setPlainText(domKey, updatedKey)
    }
  }

  function focusKey () {
    // TODO: this timeout is ugly
    setTimeout(() => {
      if (domKey) {
        setCursorToEnd(domKey)
      }
    })
  }

  function handleKeyInput () {
    newKey = getDomKey()
    if (newKey === '') {
      // immediately update to cleanup any left over <br/>
      setDomKey('')
    }
  }

  async function handleKeyKeyDown (event) {
    const combo = keyComboFromEvent(event)

    event.stopPropagation()

    if (combo === 'Escape') {
      // cancel changes
      setDomKey(key)
      onSelect({ type: SELECTION_TYPE.KEY, path })
    }

    if (!readOnly && (combo === 'Enter' || combo === 'Tab')) {
      // updating newKey here is important to handle when contents are changed
      // programmatically when edit mode is opened after typing a character
      newKey = getDomKey()

      // apply changes
      updateKey()

      // we apply selection on next tick, since the actual path will change
      await tick()
      onSelect({ type: SELECTION_TYPE.KEY, path, next: true })
    }
  }

  function handleKeyDoubleClick (event) {
    if (!editKey && !readOnly) {
      event.preventDefault()
      onSelect({ type: SELECTION_TYPE.KEY, path, edit: true })
    }
  }

  function getKeyClass (key, searchResult) {
    return classnames('editable-div', 'key', {
      search: searchResult && searchResult[STATE_SEARCH_PROPERTY],
      active: searchResult && searchResult[STATE_SEARCH_PROPERTY] === ACTIVE_SEARCH_RESULT,
      empty: key === ''
    })
  }
</script>

<div
  data-type="selectable-key"
  class={keyClass}
  contenteditable={editKey}
  spellcheck="false"
  on:input={handleKeyInput}
  on:dblclick={handleKeyDoubleClick}
  on:keydown={handleKeyKeyDown}
  bind:this={domKey}
></div>

<style src="./JSONKey.scss"></style>
