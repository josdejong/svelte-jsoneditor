<svelte:options
  accessors={false}
  immutable={true}
/>

<script>
  import createDebug from 'debug'
  import jsonrepair from 'jsonrepair'
  import Modal from 'svelte-simple-modal'
  import { uniqueId } from '../utils/uniqueId.js'
  import JSONEditor from './editor/JSONEditor.svelte'
  import JSONRepairEditor from './editor/JSONRepairEditor.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  export let json = ''
  export let text = undefined
  export let mode
  export let mainMenuBar
  export let validator
  export let onChange = null
  export let onChangeJson = null
  export let onChangeText = null
  export let onClassName = () => {}
  export let onFocus = () => {}
  export let onBlur = () => {}

  let instanceId = uniqueId()
  let createInstanceOnRepair = false

  let focus = false
  let repairing = (text !== undefined)

  let ref

  export function get () {
    return json
  }

  export function set (newJson) {
    debug('set')

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    repairing = false
    text = undefined
    json = newJson
  }

  export function update (updatedJson) {
    debug('update')

    repairing = false
    text = undefined
    json = updatedJson
  }

  export function setText (newText) {
    // do not automatically switch from text to json when we where already in text mode
    // else, it's not possible to stay in repair mode after clicking "Auto repair"
    if (newText === text) {
      return
    }

    try {
      const newJson = JSON.parse(newText)
      debug('setText parsing successful')
      set(newJson)
    } catch (err) {
      // will open JSONRepair window
      repairing = true
      createInstanceOnRepair = true
      text = newText
      debug('setText parsing failed, could not auto repair')
    }
  }

  export function updateText (newText) {
    // do not automatically switch from text to json when we where already in text mode
    // else, it's not possible to stay in repair mode after clicking "Auto repair"
    if (newText === text) {
      return
    }

    try {
      const newJson = JSON.parse(newText)
      debug('updateText parsing successful')
      update(newJson)
    } catch (err) {
      // will open JSONRepair window
      repairing = true
      createInstanceOnRepair = false
      text = newText
      debug('updateText parsing failed, could not auto repair')
    }
  }

  export function getText () {
    return repairing
      ? text
      : JSON.stringify(json, null, 2)
  }

  export function patch (operations, newSelection) {
    if (repairing) {
      throw new Error('Cannot apply patch whilst repairing invalid JSON')
    }

    return ref.patch(operations, newSelection)
  }

  export function expand (callback) {
    return ref.expand(callback)
  }

  export function collapse (callback) {
    return ref.collapse(callback)
  }

  export function scrollTo (path) {
    return ref.scrollTo(path)
  }

  export function findElement (path) {
    return ref.findElement(path)
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

  export function destroy () {
    this.$destroy()
  }

  function handleApplyRepair (repairedText) {
    debug('handleApplyRepair')

    repairing = false

    const repairedJson = JSON.parse(repairedText)

    if (createInstanceOnRepair) {
      set(repairedJson)
    } else {
      update(repairedJson)
    }

    handleChangeJson(repairedJson)
  }

  function handleCancelRepair () {
    repairing = false
    text = undefined
    if (json === undefined) {
      json = ''
    }
  }

  function handleChangeText (updatedText) {
    debug('handleChangeText')

    if (onChange) {
      onChange({
        json: undefined,
        text: updatedText
      })
    }

    if (onChangeText) {
      onChangeText(updatedText)
    }
  }

  function handleChangeJson (updatedJson) {
    debug('handleChangeJson')

    repairing = false
    text = undefined

    if (onChange) {
      onChange({
        json: updatedJson,
        text: undefined
      })
    }

    if (onChangeJson) {
      onChangeJson(updatedJson)
    }

    if (onChangeText) {
      onChangeText(JSON.stringify(updatedJson, null, 2))
    }
  }

  function handleFocus () {
    focus = true
    if (onFocus) {
      onFocus()
    }
  }

  function handleBlur () {
    focus = false
    if (onBlur) {
      onBlur()
    }
  }
</script>

<Modal>
  <div class="jsoneditor-main" class:focus>
    {#key instanceId}
      <JSONEditor
        bind:this={ref}
        bind:mode
        bind:externalDoc={json}
        bind:mainMenuBar
        bind:validator
        onChangeJson={handleChangeJson}
        bind:onClassName
        onFocus={handleFocus}
        onBlur={handleBlur}
        visible={!repairing}
      />
      {#if repairing}
        <JSONRepairEditor
          bind:text={text}
          onParse={JSON.parse}
          onRepair={jsonrepair}
          onChange={handleChangeText}
          onApply={handleApplyRepair}
          onCancel={handleCancelRepair}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      {/if}
    {/key}
  </div>
</Modal>

<style src="./Main.scss"></style>
