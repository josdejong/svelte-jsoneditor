<svelte:options accessors={false} immutable={true} />

<script lang="ts">
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
  import type {
    Content,
    JSONEditorPropsOptional,
    JSONPatchDocument,
    JSONPatchResult,
    MenuItem,
    MenuSeparatorItem,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnChangeQueryLanguage,
    OnClassName,
    OnError,
    OnFocus,
    OnRenderMenu,
    OnRenderValue,
    Path,
    QueryLanguage,
    SortModalCallback,
    TransformModalCallback,
    TransformModalOptions,
    Validator
  } from '../types'
  import { isMenuSpaceItem } from '../typeguards'
  import { noop } from 'lodash-es'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  export let content: Content = { text: '' }

  export let readOnly = false
  export let indentation: number | string = 2
  export let tabSize = 4
  export let mode: 'tree' | 'code' = MODE.TREE
  export let mainMenuBar = true
  export let navigationBar = true
  export let statusBar = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let validator: Validator | null = null

  export let queryLanguages: QueryLanguage[] = [javascriptQueryLanguage]
  export let queryLanguageId: string = queryLanguages[0].id

  export let onChangeQueryLanguage: OnChangeQueryLanguage = noop
  export let onChange: OnChange = null
  export let onRenderValue: OnRenderValue = renderValue
  export let onClassName: OnClassName = () => undefined
  export let onRenderMenu: OnRenderMenu = noop
  export let onChangeMode: OnChangeMode = noop
  export let onError: OnError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  export let onFocus: OnFocus = noop
  export let onBlur: OnBlur = noop

  let instanceId = uniqueId()

  let hasFocus = false

  let refJSONEditor
  let refTreeMode
  let refCodeMode

  let open // svelte-simple-modal context open(...)

  $: {
    const contentError = validateContentType(content)
    if (contentError) {
      console.error('Error: ' + contentError)
    }
  }

  export function get(): Content {
    return content
  }

  function getText(content: Content) {
    return isTextContent(content) ? content.text : JSON.stringify(content.json, null, indentation)
  }

  export function set(newContent: Content) {
    debug('set')

    const contentError = validateContentType(newContent)
    if (contentError) {
      throw new Error(contentError)
    }

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    content = newContent
  }

  export function update(updatedContent: Content) {
    debug('update')

    const contentError = validateContentType(updatedContent)
    if (contentError) {
      throw new Error(contentError)
    }

    content = updatedContent
  }

  export function patch(operations: JSONPatchDocument): void {
    if (isTextContent(content)) {
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
      // Note that tree mode has an optional afterPatch callback.
      // right now we don's support this in the public API.
      return refTreeMode.patch(operations)
    }

    if (refCodeMode) {
      return refCodeMode.patch(operations)
    }
  }

  export function expand(callback?: (path: Path) => boolean): void {
    if (refTreeMode) {
      return refTreeMode.expand(callback)
    } else {
      throw new Error(`Method expand is not available in mode "${mode}"`)
    }
  }

  /**
   * Open the transform modal
   */
  export function transform(options: TransformModalOptions): void {
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
   */
  export function acceptAutoRepair(): Content {
    if (refTreeMode) {
      return refTreeMode.acceptAutoRepair()
    } else {
      return content
    }
  }

  export function scrollTo(path: Path): void {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    } else {
      // TODO: implement scrollTo for code mode

      throw new Error(`Method scrollTo is not available in mode "${mode}"`)
    }
  }

  export function findElement(path: Path): Element {
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

  export function refresh() {
    if (refCodeMode) {
      refCodeMode.refresh()
    } else {
      // nothing to do in tree mode (also: don't throw an exception or so,
      // that annoying having to reckon with that when using .refresh()).
    }
  }

  export function updateProps(props: JSONEditorPropsOptional) {
    this.$set(props)
  }

  export function destroy() {
    this.$destroy()
  }

  function handleChange(
    updatedContent: Content,
    previousContent: Content,
    patchResult: JSONPatchResult | null
  ) {
    content = updatedContent

    if (onChange) {
      onChange(updatedContent, previousContent, patchResult)
    }
  }

  function handleChangeText(updatedText: string, previousText: string) {
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

  async function toggleMode(newMode: 'tree' | 'code') {
    if (mode === newMode) {
      return
    }

    mode = newMode

    await tick()
    focus()

    onChangeMode(newMode)
  }

  $: isCodeMode = mode === MODE.CODE

  let modeMenuItems: MenuItem[]
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

  const separatorMenuItem: MenuSeparatorItem = {
    separator: true
  }

  function handleRenderMenu(mode: 'tree' | 'code' | 'repair', items: MenuItem[]) {
    const updatedItems =
      mode === MODE.TREE || mode === MODE.CODE
        ? isMenuSpaceItem(items[0])
          ? modeMenuItems.concat(items) // menu is empty, readOnly mode
          : modeMenuItems.concat([separatorMenuItem], items)
        : items

    return onRenderMenu(mode, updatedItems) || updatedItems
  }

  function handleChangeQueryLanguage(newQueryLanguageId: string) {
    debug('handleChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)
  }

  // The onTransformModal method is located in JSONEditor to prevent circular references:
  //     TreeMode -> TransformModal -> TreeMode
  function onTransformModal({
    id,
    json,
    selectedPath,
    onTransform,
    onClose
  }: TransformModalCallback) {
    console.log('json', json)

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
  function onSortModal({ id, json, selectedPath, onSort, onClose }: SortModalCallback) {
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
            text={getText(content)}
            {readOnly}
            {indentation}
            {tabSize}
            {mainMenuBar}
            {statusBar}
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
