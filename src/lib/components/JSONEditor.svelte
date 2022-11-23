<svelte:options accessors={false} immutable={true} />

<script lang="ts">
  import { createDebug } from '../utils/debug'
  import Modal from 'svelte-simple-modal'
  import { SORT_MODAL_OPTIONS, TRANSFORM_MODAL_OPTIONS } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import {
    isEqualParser,
    isJSONContent,
    isTextContent,
    validateContentType
  } from '../utils/jsonUtils'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import TextMode from './modes/textmode/TextMode.svelte'
  import TreeMode from './modes/treemode/TreeMode.svelte'
  import { javascriptQueryLanguage } from '../plugins/query/javascriptQueryLanguage.js'
  import { renderValue } from '$lib/plugins/value/renderValue'
  import { tick } from 'svelte'
  import TransformModal from './modals/TransformModal.svelte'
  import SortModal from './modals/SortModal.svelte'
  import ModalRef from './modals/ModalRef.svelte'
  import type {
    Content,
    ContentErrors,
    JSONEditorPropsOptional,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    MenuItem,
    MenuSeparatorItem,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnChangeQueryLanguage,
    OnChangeStatus,
    OnClassName,
    OnError,
    OnFocus,
    OnRenderMenu,
    OnRenderValue,
    QueryLanguage,
    SortModalCallback,
    TransformModalCallback,
    TransformModalOptions,
    Validator
  } from '../types'
  import { Mode } from '../types'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isMenuSpaceItem } from '../typeguards'
  import { noop } from 'lodash-es'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:Main')

  export let content: Content = { text: '' }

  export let readOnly = false
  export let indentation: number | string = 2
  export let tabSize = 4
  export let mode: Mode = Mode.tree
  export let mainMenuBar = true
  export let navigationBar = true
  export let statusBar = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let parser: JSONParser = JSON
  export let validator: Validator | null = null
  export let validationParser: JSONParser = JSON
  export let pathParser: JSONPathParser = {
    parse: parseJSONPath,
    stringify: stringifyJSONPath
  }

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
  let refTextMode

  let open // svelte-simple-modal context open(...)

  $: {
    const contentError = validateContentType(content)
    if (contentError) {
      console.error('Error: ' + contentError)
    }
  }

  // rerender the full editor when the parser changes. This is needed because
  // numeric state is hold at many places in the editor.
  let previousParser = parser
  $: {
    if (!isEqualParser(parser, previousParser)) {
      debug('parser changed, recreate editor')

      if (isJSONContent(content)) {
        content = {
          json: parser.parse(previousParser.stringify(content.json))
        }
      }

      previousParser = parser

      // new editor id -> will re-create the editor
      instanceId = uniqueId()
    }
  }

  export function get(): Content {
    return content
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

  export function patch(operations: JSONPatchDocument): JSONPatchResult {
    if (isTextContent(content)) {
      try {
        content = {
          json: parser.parse(content.text),
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

    if (refTextMode) {
      return refTextMode.patch(operations)
    }
  }

  export function expand(callback?: (path: JSONPath) => boolean): void {
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
    if (refTextMode) {
      refTextMode.openTransformModal(options)
    } else if (refTreeMode) {
      refTreeMode.openTransformModal(options)
    } else {
      throw new Error(`Method transform is not available in mode "${mode}"`)
    }
  }

  /**
   * Validate the contents of the editor using the configured validator.
   * Returns a parse error or a list with validation warnings
   */
  export function validate(): ContentErrors {
    if (refTextMode) {
      return refTextMode.validate()
    } else if (refTreeMode) {
      return refTreeMode.validate()
    } else {
      throw new Error(`Method validate is not available in mode "${mode}"`)
    }
  }

  /**
   * In tree mode, invalid JSON is automatically repaired when loaded. When the
   * repair was successful, the repaired contents are rendered but not yet
   * applied to the document itself until the user clicks "Ok" or starts editing
   * the data. Instead of accepting the repair, the user can also click
   * "Repair manually instead". Invoking `.acceptAutoRepair()` will
   * programmatically accept the repair. This will trigger an update,
   * and the method itself also returns the updated contents. In case of text
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

  export function scrollTo(path: JSONPath): void {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    } else {
      // TODO: implement scrollTo for text mode

      throw new Error(`Method scrollTo is not available in mode "${mode}"`)
    }
  }

  export function findElement(path: JSONPath): Element {
    if (refTreeMode) {
      return refTreeMode.findElement(path)
    } else {
      throw new Error(`Method findElement is not available in mode "${mode}"`)
    }
  }

  export function focus() {
    if (refTextMode) {
      refTextMode.focus()
    } else if (refTreeMode) {
      refTreeMode.focus()
    }
  }

  export function refresh() {
    if (refTextMode) {
      refTextMode.refresh()
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

  function handleChange(updatedContent: Content, previousContent: Content, status: OnChangeStatus) {
    content = updatedContent

    if (onChange) {
      onChange(updatedContent, previousContent, status)
    }
  }

  async function handleRequestRepair() {
    mode = Mode.text

    await tick()
    onChangeMode(Mode.text)
  }

  async function handleSwitchToTreeMode() {
    mode = Mode.tree

    await tick()
    onChangeMode(Mode.tree)
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

  async function toggleMode(newMode: Mode) {
    if (mode === newMode) {
      return
    }

    mode = newMode

    await tick()
    focus()

    onChangeMode(newMode)
  }

  let modeMenuItems: MenuItem[]
  $: modeMenuItems = [
    {
      text: 'text',
      title: `Switch to text mode (current mode: ${mode})`,
      // check for 'code' mode is here for backward compatibility (deprecated since v0.4.0)
      className:
        'jse-group-button jse-first' +
        (mode === Mode.text || mode === 'code' ? ' jse-selected' : ''),
      onClick: () => toggleMode(Mode.text)
    },
    {
      text: 'tree',
      title: `Switch to tree mode (current mode: ${mode})`,
      className: 'jse-group-button jse-last' + (mode === Mode.tree ? ' jse-selected' : ''),
      onClick: () => toggleMode(Mode.tree)
    }
  ]

  const separatorMenuItem: MenuSeparatorItem = {
    separator: true
  }

  $: handleRenderMenu = (mode: 'tree' | 'text' | 'repair', items: MenuItem[]) => {
    const updatedItems =
      mode === 'repair'
        ? items
        : isMenuSpaceItem(items[0])
        ? modeMenuItems.concat(items) // menu is empty, readOnly mode
        : modeMenuItems.concat(separatorMenuItem, items)

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
        parser,
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

  $: {
    debug('mode changed to', mode)
    if (mode === 'code') {
      // check for 'code' is here for backward compatibility (deprecated since v0.4.0)
      console.warn(
        'Deprecation warning: "code" mode is renamed to "text". Please use mode="text" instead.'
      )
    }
  }
</script>

<Modal>
  <ModalRef bind:open />
  <AbsolutePopup>
    <div class="jse-main" class:jse-focus={hasFocus} bind:this={refJSONEditor}>
      {#key instanceId}
        <!-- check for 'code' is here for backward compatibility (deprecated since v0.4.0) -->
        {#if mode === Mode.text || mode === 'code'}
          <TextMode
            bind:this={refTextMode}
            externalContent={content}
            {readOnly}
            {indentation}
            {tabSize}
            {mainMenuBar}
            {statusBar}
            {escapeUnicodeCharacters}
            {parser}
            {validator}
            {validationParser}
            onChange={handleChange}
            onSwitchToTreeMode={handleSwitchToTreeMode}
            {onError}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onRenderMenu={handleRenderMenu}
            {onSortModal}
            {onTransformModal}
          />
        {:else}
          <!-- mode === Mode.tree -->
          <TreeMode
            bind:this={refTreeMode}
            {readOnly}
            {indentation}
            externalContent={content}
            {mainMenuBar}
            {navigationBar}
            {escapeControlCharacters}
            {escapeUnicodeCharacters}
            {parser}
            {validator}
            {validationParser}
            {pathParser}
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
