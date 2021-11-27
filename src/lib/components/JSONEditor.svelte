<svelte:options accessors={false} immutable={true} />

<script>
  import { faCode } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '../utils/debug'
  import Modal from 'svelte-simple-modal'
  import { MODE } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import { validateContentType } from '../utils/jsonUtils'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import CodeMode from './modes/codemode/CodeMode.svelte'
  import TreeMode from './modes/treemode/TreeMode.svelte'
  import { javascriptQueryLanguage } from '../plugins/query/javascriptQueryLanguage.js'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  // eslint-disable-next-line no-undef-init
  export let content = { text: '' }

  $: {
    const contentError = validateContentType(content)
    if (contentError) {
      console.error('Error: ' + contentError)
    }
  }

  export let readOnly = false
  export let indentation = 2
  export let mode = MODE.TREE
  export let mainMenuBar = true
  export let navigationBar = true
  export let validator = null

  /** @type {QueryLanguage[]} */
  export let queryLanguages = [javascriptQueryLanguage]

  /** @type {string} */
  export let queryLanguageId = queryLanguages[0].id

  /** @type {(queryLanguageId: string) => void} */
  export let onChangeQueryLanguage = () => {
    // no op by default
  }

  /** @type {((content: Content, previousContent: Content, patchResult: JSONPatchResult | null) => void) | null} */
  export let onChange = null

  export let onClassName = () => {
    // no op by default
  }
  export let onRenderMenu = () => {
    // no op by default
  }
  export let onChangeMode = () => {
    // no op by default
  }
  export let onError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  export let onFocus = () => {
    // no op by default
  }
  export let onBlur = () => {
    // no op by default
  }

  let instanceId = uniqueId()

  let hasFocus = false

  let refJSONEditor
  let refTreeMode
  let refCodeMode

  $: textForCodeMode = mode === MODE.CODE ? getText(content.json, content.text) : undefined

  export function get() {
    return content
  }

  function getText() {
    return typeof content.text === 'string'
      ? content.text
      : JSON.stringify(content.json, null, indentation)
  }

  export function set(newContent) {
    debug('set')

    const contentError = validateContentType(newContent)
    if (contentError) {
      throw new Error(contentError)
    }

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    content = newContent
  }

  export function update(updatedContent) {
    debug('update')

    const contentError = validateContentType(updatedContent)
    if (contentError) {
      throw new Error(contentError)
    }

    content = updatedContent
  }

  export function patch(operations, newSelection) {
    if (content.json === undefined) {
      try {
        content = {
          json: JSON.parse(content.text),
          text: undefined
        }
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

  export function expand(callback) {
    if (refTreeMode) {
      return refTreeMode.expand(callback)
    } else {
      throw new Error(`Method expand is not available in mode "${mode}"`)
    }
  }

  /**
   * @param {Object} options
   * @property {string} [id]
   * @property {({ operations: JSONPatchDocument, json: JSON, transformedJson: JSON }) => void} [onTransform]
   * @property {() => void} [onClose]
   */
  export function transform(options) {
    if (refCodeMode) {
      refCodeMode.openTransformModal(options)
    } else if (refTreeMode) {
      refTreeMode.openTransformModal(options)
    } else {
      throw new Error(`Method transform is not available in mode "${mode}"`)
    }
  }

  export function scrollTo(path) {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    } else {
      // TODO: implement scrollTo for code mode

      throw new Error(`Method scrollTo is not available in mode "${mode}"`)
    }
  }

  export function findElement(path) {
    if (refTreeMode) {
      return refTreeMode.findElement(path)
    } else {
      throw new Error(`Method findElement is not available in mode "${mode}"`)
    }
  }

  export function focus() {
    if (refCodeMode) {
      refCodeMode.focus()
    } else if (refTreeMode) {
      refTreeMode.focus()
    }
  }

  export function updateProps(props) {
    this.$set(props)
  }

  export function destroy() {
    this.$destroy()
  }

  /**
   * @param {Content} updatedContent
   * @param {Content} previousContent
   * @param {JSONPatchResult | null} patchResult
   */
  function handleChange(updatedContent, previousContent, patchResult) {
    content = updatedContent

    if (onChange) {
      onChange(updatedContent, previousContent, patchResult)
    }
  }

  /**
   * @param {string} updatedText
   * @param {string} previousText
   */
  function handleChangeText(updatedText, previousText) {
    const updatedContent = {
      text: updatedText,
      json: undefined
    }

    const previousContent = {
      text: previousText,
      json: undefined
    }

    const patchResult = null

    handleChange(updatedContent, previousContent, patchResult)
  }

  function handleRequestRepair() {
    mode = MODE.CODE
    onChangeMode(mode)
  }

  function handleSwitchToTreeMode() {
    mode = MODE.TREE
    onChangeMode(mode)
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

  function toggleCodeMode() {
    mode = mode === MODE.CODE ? MODE.TREE : MODE.CODE

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
    }
  ]

  const separatorMenuItem = {
    separator: true
  }

  function handleRenderMenu(mode, items) {
    const updatedItems =
      mode === MODE.TREE || mode === MODE.CODE
        ? items[0].space === true
          ? modeMenuItems.concat(items) // menu is empty, readOnly mode
          : modeMenuItems.concat([separatorMenuItem], items)
        : items

    return onRenderMenu(mode, updatedItems) || updatedItems
  }

  function handleChangeQueryLanguage(newQueryLanguageId) {
    debug('handleChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)
  }
</script>

<Modal>
  <AbsolutePopup>
    <div class="jsoneditor-main" class:focus={hasFocus} bind:this={refJSONEditor}>
      {#key instanceId}
        {#if mode === MODE.CODE}
          <CodeMode
            bind:this={refCodeMode}
            text={textForCodeMode}
            {readOnly}
            {indentation}
            {mainMenuBar}
            {navigationBar}
            {validator}
            {queryLanguages}
            {queryLanguageId}
            onChangeQueryLanguage={handleChangeQueryLanguage}
            onChange={handleChangeText}
            onSwitchToTreeMode={handleSwitchToTreeMode}
            {onError}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onRenderMenu={handleRenderMenu}
          />
        {:else}
          <!-- mode === MODE.TREE -->
          <TreeMode
            bind:this={refTreeMode}
            {readOnly}
            {indentation}
            externalContent={content}
            {mainMenuBar}
            {navigationBar}
            {validator}
            {queryLanguages}
            {queryLanguageId}
            onChangeQueryLanguage={handleChangeQueryLanguage}
            {onError}
            onChange={handleChange}
            onRequestRepair={handleRequestRepair}
            {onClassName}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onRenderMenu={handleRenderMenu}
          />
        {/if}
      {/key}
    </div>
  </AbsolutePopup>
</Modal>

<style src="./JSONEditor.scss"></style>
