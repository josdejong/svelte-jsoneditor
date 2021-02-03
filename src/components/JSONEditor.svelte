<svelte:options
  accessors={false}
  immutable={true}
/>

<script>
  import CodeMode from './codemode/CodeMode.svelte'
  import createDebug from 'debug'
  import jsonrepair from 'jsonrepair'
  import Modal from 'svelte-simple-modal'
  import { MODE } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import JSONEditorComponent from './editor/JSONEditorComponent.svelte'
  import JSONRepairComponent from './editor/JSONRepairComponent.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  export let json = ''
  // eslint-disable-next-line no-undef-init
  export let text = undefined
  export let readOnly = false
  export let mode = MODE.TREE
  export let mainMenuBar = true
  export let validator = null
  export let onChange = null
  export let onClassName = () => {}
  export let onFocus = () => {}
  export let onBlur = () => {}

  let instanceId = uniqueId()
  let createInstanceOnRepair = false

  let hasFocus = false
  let repairing = (text !== undefined)

  let ref

  export function get() {
    return (typeof text === 'string')
      ? JSON.parse(text)
      : json
  }

  export function getText() {
    return (typeof text === 'string')
      ? text
      : JSON.stringify(json, null, 2)
  }

  export function set(newJson) {
    debug('set')

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    text = undefined
    json = newJson
    repairing = false
  }

  export function setText(newNext) {
    debug('setText')

    if (text === newNext) {
      // do NOT apply the text again when there are no changes,
      // this would switch the editor from repair mode to non-repair mode
      // as soon as the text has become valid json
      return
    }

    try {
      const newJson = JSON.parse(newNext)

      debug('set text parsing successful')

      set(newJson)
    } catch (err) {
      // will open JSONRepair window

      // Important: do NOT update json here!
      // when cancelling repair, we want to get back the old json
      text = newNext
      repairing = newNext !== undefined
      createInstanceOnRepair = true
      debug('set text parsing failed, could not auto repair')
    }
  }

  export function update(updatedJson) {
    debug('update')

    text = undefined
    json = updatedJson
    repairing = false
  }

  export function updateText(updatedText) {
    debug('updateText')

    if (text === updatedText) {
      // do NOT apply the text again when there are no changes,
      // this would switch the editor from repair mode to non-repair mode
      // as soon as the text has become valid json
      return
    }

    try {
      const updatedJson = JSON.parse(updatedText)

      debug('update text parsing successful')

      update(updatedJson)
    } catch (err) {
      // will open JSONRepair window

      // Important: do NOT update json or createInstanceOnRepair here!
      // when cancelling repair, we want to get back the old json,
      // and when this update was called after a set, we should not change
      // createInstanceOnRepair back to false here
      text = updatedText
      repairing = true

      debug('update text parsing failed, could not auto repair')
    }
  }

  export function patch(operations, newSelection) {
    if (repairing) {
      throw new Error('Cannot apply patch whilst repairing invalid JSON')
    }

    return ref.patch(operations, newSelection)
  }

  export function expand(callback) {
    return ref.expand(callback)
  }

  export function collapse(callback) {
    return ref.collapse(callback)
  }

  export function scrollTo(path) {
    return ref.scrollTo(path)
  }

  export function findElement(path) {
    return ref.findElement(path)
  }

  export function setValidator(newValidator) {
    validator = newValidator
  }

  export function getValidator() {
    return validator
  }

  export function setMainMenuBar(newMainMenuBar) {
    mainMenuBar = newMainMenuBar
  }

  export function getMainMenuBar() {
    return mainMenuBar
  }

  export function setMode(newMode) {
    mode = newMode
  }

  export function getMode() {
    return mode
  }

  export function focus() {
    ref.focus()
  }

  export function destroy() {
    this.$destroy()
  }

  function handleApplyRepair(repairedText) {
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

  function handleCancelRepair() {
    repairing = false
    createInstanceOnRepair = false
    text = undefined
    if (json === undefined) {
      json = ''
    }

    setTimeout(() => ref.focus())
  }

  function handleChangeText(updatedText) {
    debug('handleChangeText')

    if (onChange) {
      onChange({
        json: undefined,
        text: updatedText
      })
    }
  }

  function handleChangeJson(updatedJson) {
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

  function handleFocus() {
    hasFocus = true
    if (onFocus) {
      onFocus()
    }
  }

  function handleBlur() {
    hasFocus = false
    if (onBlur) {
      onBlur()
    }
  }
</script>

<Modal>
  <div class="jsoneditor-main" class:focus={hasFocus}>
    {#if mode === MODE.CODE}
      <CodeMode
        readOnly={readOnly}
        bind:text
        bind:mainMenuBar
        onChange={handleChangeText}
      />
    {:else} <!-- mode === MODE.TREE -->
      {#key instanceId}
        <JSONEditorComponent
          bind:this={ref}
          readOnly={readOnly}
          bind:externalJson={json}
          bind:mainMenuBar
          bind:validator
          onChangeJson={handleChangeJson}
          bind:onClassName
          onFocus={handleFocus}
          onBlur={handleBlur}
          visible={!repairing}
        />
        {#if repairing}
          <JSONRepairComponent
            bind:text={text}
            readOnly={readOnly}
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
    {/if}
  </div>
</Modal>

<style src="./JSONEditor.scss"></style>
