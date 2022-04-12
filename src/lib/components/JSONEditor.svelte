<svelte:options accessors={false} immutable={true} />

<script>
  import { createDebug } from '../utils/debug'
  import Modal from 'svelte-simple-modal'
  import { MODE, SORT_MODAL_OPTIONS, TRANSFORM_MODAL_OPTIONS } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import { isTextContent, validateContentType } from '../utils/jsonUtils'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import CodeMode from './modes/codemode/CodeMode.svelte'
  import TreeMode from './modes/treemode/TreeMode.svelte'
  import { javascriptQueryLanguage } from '../plugins/query/javascriptQueryLanguage.js'
  import { renderValue } from '$lib/plugins/value/renderValue'
  import { tick } from 'svelte'
  import TransformModal from './modals/TransformModal.svelte'
  import SortModal from './modals/SortModal.svelte'
  import ModalRef from './modals/ModalRef.svelte'

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
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
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

  /** @type {(props: RenderValueProps) => RenderValueConstructor[]} */
  export let onRenderValue = renderValue

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

  let open // svelte-simple-modal context open(...)

  $: textForCodeMode = mode === MODE.CODE ? getText(content.json, content.text) : undefined

  export function get() {
    return content
  }

  function getText() {
    return isTextContent(content) ? content.text : JSON.stringify(content.json, null, indentation)
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
   * @property {Path} [selectedPath]
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

  /**
   * In tree mode, invalid JSON is automatically repaired when loaded. When the
   * repair was successful, the repaired contents are rendered but not yet
   * applied to the document itself until the user clicks "Ok" or starts editing
   * the data. Instead of accepting the repair, the user can also click
   * "Repair manually instead". Invoking `.acceptAutoRepair()` will
   * programmatically accept the repair. This will trigger an update,
   * and the method itself also returns the updated contents. In case of code
   * mode or when the editor is not in an "accept auto repair" status, nothing
   * will happen, and the contents will be returned as is.
   * @returns {Content}
   */
  export function acceptAutoRepair() {
    if (refTreeMode) {
      return refTreeMode.acceptAutoRepair()
    } else {
      return content
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

  async function handleRequestRepair() {
    mode = MODE.CODE

    await tick()
    onChangeMode(MODE.CODE)
  }

  async function handleSwitchToTreeMode() {
    mode = MODE.TREE

    await tick()
    onChangeMode(MODE.TREE)
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

  async function toggleMode(newMode) {
    if (mode === newMode) {
      return
    }

    mode = newMode

    await tick()
    focus()

    onChangeMode(newMode)
  }

  $: isCodeMode = mode === MODE.CODE
  $: modeMenuItems = [
    {
      text: 'code',
      title: `Switch to code mode (current mode: ${mode})`,
      className: 'jse-group-button jse-first' + (isCodeMode ? ' jse-selected' : ''),
      onClick: () => toggleMode(MODE.CODE)
    },
    {
      text: 'tree',
      title: `Switch to tree mode (current mode: ${mode})`,
      className: 'jse-group-button jse-last' + (!isCodeMode ? ' jse-selected' : ''),
      onClick: () => toggleMode(MODE.TREE)
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

  // The onTransformModal method is located in JSONEditor to prevent circular references:
  //     TreeMode -> TransformModal -> TreeMode
  export function onTransformModal({ id, json, selectedPath, onTransform, onClose }) {
    if (readOnly) {
      return
    }

    open(
      TransformModal,
      {
        id,
        json,
        selectedPath,
        escapeControlCharacters,
        escapeUnicodeCharacters,
        queryLanguages,
        queryLanguageId,
        onChangeQueryLanguage: handleChangeQueryLanguage,
        onRenderValue,
        onClassName,
        onTransform
      },
      TRANSFORM_MODAL_OPTIONS,
      {
        onClose
      }
    )
  }

  // The onSortModal is positioned here for consistency with TransformModal
  export function onSortModal({ id, json, selectedPath, onSort, onClose }) {
    if (readOnly) {
      return
    }

    open(
      SortModal,
      {
        id,
        json,
        selectedPath,
        onSort
      },
      SORT_MODAL_OPTIONS,
      {
        onClose
      }
    )
  }
</script>

<Modal>
  <ModalRef bind:open />
  <AbsolutePopup>
    <div class="jse-main" class:jse-focus={hasFocus} bind:this={refJSONEditor}>
      {#key instanceId}
        {#if mode === MODE.CODE}
          <CodeMode
            bind:this={refCodeMode}
            text={textForCodeMode}
            {readOnly}
            {indentation}
            {mainMenuBar}
            {escapeUnicodeCharacters}
            {validator}
            onChange={handleChangeText}
            onSwitchToTreeMode={handleSwitchToTreeMode}
            {onError}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onRenderMenu={handleRenderMenu}
            {onSortModal}
            {onTransformModal}
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
            {escapeControlCharacters}
            {escapeUnicodeCharacters}
            {validator}
            {onError}
            onChange={handleChange}
            onRequestRepair={handleRequestRepair}
            {onRenderValue}
            {onClassName}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onRenderMenu={handleRenderMenu}
            {onSortModal}
            {onTransformModal}
          />
        {/if}
      {/key}
    </div>
  </AbsolutePopup>
</Modal>

<style src="./JSONEditor.scss"></style>
