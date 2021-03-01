<svelte:options
  accessors={false}
  immutable={true}
/>

<script>
  import { faCode } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import Modal from 'svelte-simple-modal'
  import { MODE } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import CodeMode from './modes/codemode/CodeMode.svelte'
  import TreeMode from './modes/treemode/TreeMode.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  export let json = {}
  // eslint-disable-next-line no-undef-init
  export let text = undefined
  export let readOnly = false
  export let indentation = 2
  export let mode = MODE.TREE
  export let mainMenuBar = true
  export let validator = null
  export let onChange = null
  export let onClassName = () => {}
  export let onRenderMenu = () => {}
  export let onChangeMode = () => {}
  export let onError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  export let onFocus = () => {}
  export let onBlur = () => {}

  let instanceId = uniqueId()

  let hasFocus = false

  let refTreeMode
  let refCodeMode

  $: textForCodeMode = (mode === MODE.CODE)
    ? getText(json, text)
    : undefined

  export function get () {
    return json !== undefined
      ? json
      : JSON.parse(text || '')
  }

  export function getText () {
    return (typeof text === 'string')
      ? text
      : JSON.stringify(json, null, indentation)
  }

  export function set (newJson) {
    debug('set')

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    text = undefined
    json = newJson
  }

  export function setText (newText) {
    debug('setText')

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    text = newText
    json = undefined
  }

  export function update (updatedJson) {
    debug('update')

    text = undefined
    json = updatedJson
  }

  export function updateText (updatedText) {
    debug('updateText')

    text = updatedText
    json = undefined
  }

  export function patch (operations, newSelection) {
    if (json === undefined) {
      try {
        json = JSON.parse(text)
        text = undefined
      } catch (err) {
        throw new Error('Cannot apply patch: current document contains invalid JSON')
      }
    }

    if (refTreeMode) {
      return refTreeMode.patch(operations, newSelection)
    }

    if (refCodeMode) {
      return refCodeMode.patch(operations)
    }
  }

  export function expand (callback) {
    if (refTreeMode) {
      return refTreeMode.expand(callback)
    }

    throw new Error(`Method expand is not available in mode "${mode}"`)
  }

  export function collapse (callback) {
    if (refTreeMode) {
      return refTreeMode.collapse(callback)
    }

    throw new Error(`Method collapse is not available in mode "${mode}"`)
  }

  export function scrollTo (path) {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    }

    // TODO: implement scrollTo for code mode

    throw new Error(`Method scrollTo is not available in mode "${mode}"`)
  }

  export function findElement (path) {
    if (refTreeMode) {
      return refTreeMode.findElement(path)
    }

    throw new Error(`Method findElement is not available in mode "${mode}"`)
  }

  export function setValidator (newValidator) {
    validator = newValidator
  }

  export function getValidator () {
    return validator
  }

  export function setMainMenuBar (newMainMenuBar) {
    mainMenuBar = newMainMenuBar
  }

  export function getMainMenuBar () {
    return mainMenuBar
  }

  export function setMode (newMode) {
    mode = newMode
  }

  export function getMode () {
    return mode
  }

  export function focus () {
    if (refCodeMode) {
      refCodeMode.focus()
    }

    if (refTreeMode) {
      refTreeMode.focus()
    }
  }

  export function destroy () {
    this.$destroy()
  }

  function handleChangeText (updatedText) {
    text = updatedText
    json = undefined

    if (onChange) {
      onChange({
        json,
        text
      })
    }
  }

  function handleChangeJson (updatedJson) {
    json = updatedJson
    text = undefined

    if (onChange) {
      onChange({
        json,
        text
      })
    }
  }

  function handleRequestRepair () {
    mode = MODE.CODE
  }

  function handleSwitchToTreeMode () {
    mode = MODE.TREE
  }

  function handleFocus () {
    hasFocus = true
    if (onFocus) {
      onFocus()
    }
  }

  function handleBlur () {
    hasFocus = false
    if (onBlur) {
      onBlur()
    }
  }

  function toggleCodeMode () {
    mode = (mode === MODE.CODE)
      ? MODE.TREE
      : MODE.CODE

    onChangeMode(mode)
    setTimeout(focus)
  }

  $: isCodeMode = mode === MODE.CODE
  $: modeMenuItems = [
    {
      icon: faCode,
      title: `Toggle code mode on/off (currently: ${isCodeMode ? 'on' : 'off'})`,
      className: 'code-mode' + (isCodeMode ? ' selected' : ''),
      onClick: toggleCodeMode
    },
    {
      separator: true
    }
  ]

  function handleCreateMenu (mode, items) {
    const updatedItems = (mode === MODE.TREE || mode === MODE.CODE)
      ? modeMenuItems.concat(items)
      : items

    return onRenderMenu(mode, updatedItems) || updatedItems
  }
</script>

<Modal>
  <div class="jsoneditor-main" class:focus={hasFocus}>
    {#key instanceId}
      {#if mode === MODE.CODE}
        <CodeMode
          bind:this={refCodeMode}
          text={textForCodeMode}
          readOnly={readOnly}
          indentation={indentation}
          mainMenuBar={mainMenuBar}
          validator={validator}
          onChange={handleChangeText}
          onSwitchToTreeMode={handleSwitchToTreeMode}
          onError={onError}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onRenderMenu={handleCreateMenu}
        />
      {:else} <!-- mode === MODE.TREE -->
        <TreeMode
          bind:this={refTreeMode}
          readOnly={readOnly}
          indentation={indentation}
          externalJson={json}
          externalText={text}
          mainMenuBar={mainMenuBar}
          validator={validator}
          onError={onError}
          onChange={handleChangeJson}
          onRequestRepair={handleRequestRepair}
          onClassName={onClassName}
          onRenderMenu={handleCreateMenu}
          onFocus={handleFocus}
          onBlur={handleBlur}
          visible={true}
        />
      {/if}
    {/key}
  </div>
</Modal>

<style src="./JSONEditor.scss"></style>
