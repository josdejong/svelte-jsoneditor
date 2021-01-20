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
  export let onClassName = () => {}
  export let onFocus = () => {}
  export let onBlur = () => {}

  let instanceId = uniqueId()
  let createInstanceOnRepair = false

  let focus = false
  let repairing = (text !== undefined)

  let ref

  export function get () {
    return {
      text,
      json: (typeof text === 'string')
        ? undefined
        : json
    }
  }

  export function set (newContent) {
    debug('set')

    if (!isContent(newContent)) {
      throw new Error('Invalid content: object with either a json or text property expected')
    }

    if (typeof newContent.text === 'string') {
      try {
        const newJson = JSON.parse(newContent.text)

        debug('set text parsing successful')

        set({ json: newJson })
      } catch (err) {
        // will open JSONRepair window

        // Important: do NOT update json here!
        // when cancelling repair, we want to get back the old json
        text = newContent.text
        repairing = newContent.text !== undefined
        createInstanceOnRepair = true
        debug('set text parsing failed, could not auto repair')
      }
    } else {
      // new editor id -> will re-create the editor
      instanceId = uniqueId()

      text = undefined
      json = newContent.json
      repairing = false
    }
  }

  export function update (updatedContent) {
    debug('update', { updatedContent })

    if (!isContent(updatedContent)) {
      throw new Error('Invalid content: object with either a json or text property expected')
    }

    if (typeof updatedContent.text === 'string') {
      try {
        const updatedJson = JSON.parse(updatedContent.text)
        text = undefined
        json = updatedJson
        repairing = false
        debug('update text parsing successful')
      } catch (err) {
        // will open JSONRepair window

        // Important: do NOT update json or createInstanceOnRepair here!
        // when cancelling repair, we want to get back the old json,
        // and when this update was called after a set, we should not change
        // createInstanceOnRepair back to false here
        text = updatedContent.text
        repairing = true

        debug('update text parsing failed, could not auto repair')
      }
    } else {
      text = undefined
      json = updatedContent.json
      repairing = false
    }
  }

  function isContent (value) {
    return (value &&
      typeof value === 'object' &&
      (value.json !== undefined || typeof value.text === 'string'))
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

    const repairedJson = JSON.parse(repairedText)

    repairing = false

    if (createInstanceOnRepair) {
      createInstanceOnRepair = false
      set({
        json: repairedJson,
        text: undefined
      })
    } else {
      update({
        json: repairedJson,
        text: undefined
      })
    }

    handleChangeJson(repairedJson)
  }

  function handleCancelRepair () {
    repairing = false
    createInstanceOnRepair = false
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
