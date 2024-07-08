<svelte:options accessors={false} immutable={true} />

<script lang="ts">
  import { createDebug } from '../utils/debug.js'
  import type { Callbacks, Component, Open } from 'svelte-simple-modal'
  import Modal, { bind } from 'svelte-simple-modal'
  import { JSONEDITOR_MODAL_OPTIONS } from '../constants.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import {
    isEqualParser,
    isJSONContent,
    isTextContent,
    validateContentType
  } from '../utils/jsonUtils.js'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import { javascriptQueryLanguage } from '$lib/plugins/query/javascriptQueryLanguage.js'
  import { renderValue } from '$lib/plugins/value/renderValue.js'
  import { tick } from 'svelte'
  import TransformModal from './modals/TransformModal.svelte'
  import type {
    Content,
    ContentErrors,
    ContextMenuItem,
    JSONEditorModalCallback,
    JSONEditorPropsOptional,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    MenuItem,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnChangeQueryLanguage,
    OnChangeStatus,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnRenderMenu,
    OnRenderValue,
    OnSelect,
    QueryLanguage,
    SortModalProps,
    TransformModalCallback,
    TransformModalOptions,
    TransformModalProps,
    Validator
  } from '$lib/types'
  import type { OnRenderContextMenu } from '$lib/types.js'
  import { Mode } from '$lib/types.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { noop } from '../utils/noop.js'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import JSONEditorRoot from './modes/JSONEditorRoot.svelte'
  import JSONEditorModal from './modals/JSONEditorModal.svelte'
  import memoizeOne from 'memoize-one'
  import ModalRef from '../components/modals/ModalRef.svelte'
  import { cloneDeep } from 'lodash-es'
  import SortModal from '$lib/components/modals/SortModal.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:JSONEditor')

  export let content: Content = { text: '' }
  export let selection: JSONEditorSelection | undefined = undefined

  export let readOnly = false
  export let indentation: number | string = 2
  export let tabSize = 4
  export let mode: Mode = Mode.tree
  export let mainMenuBar = true
  export let navigationBar = true
  export let statusBar = true
  export let askToFormat = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let flattenColumns = true
  export let parser: JSONParser = JSON
  export let validator: Validator | undefined = undefined
  export let validationParser: JSONParser = JSON
  export let pathParser: JSONPathParser = {
    parse: parseJSONPath,
    stringify: stringifyJSONPath
  }

  export let queryLanguages: QueryLanguage[] = [javascriptQueryLanguage]
  export let queryLanguageId: string = queryLanguages[0].id

  export let onChangeQueryLanguage: OnChangeQueryLanguage = noop
  export let onChange: OnChange | undefined = undefined
  export let onSelect: OnSelect | undefined = undefined
  export let onRenderValue: OnRenderValue = renderValue
  export let onClassName: OnClassName = () => undefined
  export let onRenderMenu: OnRenderMenu = noop
  export let onRenderContextMenu: OnRenderContextMenu = noop
  export let onChangeMode: OnChangeMode = noop
  export let onError: OnError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  export let onFocus: OnFocus = noop
  export let onBlur: OnBlur = noop

  let instanceId = uniqueId()
  let hasFocus = false
  let refJSONEditorRoot: JSONEditorRoot
  let open: Open // svelte-simple-modal context open(...)
  let jsoneditorModalState:
    | {
        component: Component
        callbacks: Partial<Callbacks>
      }
    | undefined = undefined

  let sortModalProps: SortModalProps | undefined
  let transformModalProps: TransformModalProps | undefined

  $: {
    const contentError = validateContentType(content)
    if (contentError) {
      console.error('Error: ' + contentError)
    }
  }

  // backward compatibility warning since v1.0.0
  $: if (selection === null) {
    console.warn('selection is invalid: it is null but should be undefined')
  }

  // We memoize the last parse result for the case when the content is text and very large.
  // In that case parsing takes a few seconds. When the user switches between tree and table mode,
  // without having made a change, we do not want to parse the text again.
  $: parseMemoizeOne = memoizeOne(parser.parse)

  // rerender the full editor when the parser changes. This is needed because
  // numeric state is hold at many places in the editor.
  let previousParser = parser
  $: {
    if (!isEqualParser(parser, previousParser)) {
      debug('parser changed, recreate editor')

      if (isJSONContent(content)) {
        const text = previousParser.stringify(content.json)
        content = {
          json: text !== undefined ? parser.parse(text) : undefined
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

  export async function set(newContent: Content): Promise<void> {
    debug('set')

    const contentError = validateContentType(newContent)
    if (contentError) {
      throw new Error(contentError)
    }

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    // update content *after* re-render, so that the new editor will trigger an onChange event
    content = newContent
  }

  export async function update(updatedContent: Content): Promise<void> {
    debug('update')

    const contentError = validateContentType(updatedContent)
    if (contentError) {
      throw new Error(contentError)
    }

    content = updatedContent

    await tick() // await rerender
  }

  export async function patch(operations: JSONPatchDocument): Promise<JSONPatchResult> {
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

    // Note that patch has an optional afterPatch callback.
    // right now we don's support this in the public API.
    const result = refJSONEditorRoot.patch(operations)

    await tick() // await rerender

    return result
  }

  export async function select(newSelection: JSONEditorSelection | undefined) {
    selection = newSelection

    await tick() // await rerender
  }

  export async function expand(path: JSONPath, callback?: OnExpand): Promise<void> {
    refJSONEditorRoot.expand(path, callback)

    await tick() // await rerender
  }

  export async function collapse(path: JSONPath, recursive = false): Promise<void> {
    refJSONEditorRoot.collapse(path, recursive)

    await tick() // await rerender
  }

  /**
   * Open the transform modal
   */
  export function transform(options: TransformModalOptions): void {
    refJSONEditorRoot.transform(options)
  }

  /**
   * Validate the contents of the editor using the configured validator.
   * Returns a parse error or a list with validation warnings
   */
  export function validate(): ContentErrors | undefined {
    return refJSONEditorRoot.validate()
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
  export async function acceptAutoRepair(): Promise<Content> {
    const content = refJSONEditorRoot.acceptAutoRepair()

    await tick() // await rerender

    return content
  }

  export async function scrollTo(path: JSONPath): Promise<void> {
    await refJSONEditorRoot.scrollTo(path)
  }

  export function findElement(path: JSONPath): Element | undefined {
    return refJSONEditorRoot.findElement(path)
  }

  export async function focus(): Promise<void> {
    refJSONEditorRoot.focus()

    await tick() // await rerender
  }

  export async function refresh(): Promise<void> {
    await refJSONEditorRoot.refresh()
  }

  export async function updateProps(props: JSONEditorPropsOptional): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.$set(props)

    await tick() // await rerender
  }

  export async function destroy() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.$destroy()

    await tick() // await destroying
  }

  function handleChange(updatedContent: Content, previousContent: Content, status: OnChangeStatus) {
    content = updatedContent

    if (onChange) {
      onChange(updatedContent, previousContent, status)
    }
  }

  function handleSelect(updatedSelection: JSONEditorSelection | undefined) {
    selection = updatedSelection

    if (onSelect) {
      onSelect(cloneDeep(updatedSelection))
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

  async function toggleMode(newMode: Mode) {
    if (mode === newMode) {
      return
    }

    mode = newMode

    await tick()
    await focus()

    onChangeMode(newMode)
  }

  function handleChangeQueryLanguage(newQueryLanguageId: string) {
    debug('handleChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)
  }

  // The onTransformModal method is located in JSONEditor to prevent circular references:
  //     TreeMode -> TransformModal -> TreeMode
  function onTransformModal({ id, json, rootPath, onTransform, onClose }: TransformModalCallback) {
    if (readOnly) {
      return
    }

    transformModalProps = {
      id,
      json,
      rootPath,
      indentation,
      escapeControlCharacters,
      escapeUnicodeCharacters,
      parser,
      parseMemoizeOne,
      validationParser,
      pathParser,
      queryLanguages,
      queryLanguageId,
      onChangeQueryLanguage: handleChangeQueryLanguage,
      onRenderValue,
      onRenderMenu: (items: MenuItem[]) => onRenderMenu(items, { mode, modal: true, readOnly }),
      onRenderContextMenu: (items: ContextMenuItem[]) =>
        onRenderContextMenu(items, { mode, modal: true, readOnly, selection }),
      onClassName,
      onTransform,
      onClose
    }
  }

  // The onSortModal is positioned here for consistency with TransformModal
  function onSortModal(props: SortModalProps) {
    if (readOnly) {
      return
    }

    sortModalProps = props
  }

  // The onJSONEditorModal method is located in JSONEditor to prevent circular references:
  //     JSONEditor -> TableMode -> JSONEditorModal -> JSONEditor
  function onJSONEditorModal({ content, path, onPatch, onClose }: JSONEditorModalCallback) {
    debug('onJSONEditorModal', { content, path })

    jsoneditorModalState = {
      component: bind(JSONEditorModal, {
        content,
        path,
        onPatch,

        readOnly,
        indentation,
        tabSize,
        mainMenuBar,
        navigationBar,
        statusBar,
        askToFormat,
        escapeControlCharacters,
        escapeUnicodeCharacters,
        flattenColumns,
        parser,
        validator: undefined, // TODO: support partial JSON validation?
        validationParser,
        pathParser,
        onRenderValue,
        onClassName,
        onRenderMenu,
        onRenderContextMenu,
        onSortModal,
        onTransformModal
      }),
      callbacks: {
        onClose
      }
    }
  }

  function closeJSONEditorModal() {
    jsoneditorModalState?.callbacks?.onClose?.()
    jsoneditorModalState = undefined
  }

  $: debug('mode changed to', mode)
</script>

<AbsolutePopup>
  <Modal
    show={jsoneditorModalState?.component}
    {...JSONEDITOR_MODAL_OPTIONS}
    closeOnEsc={false}
    on:close={closeJSONEditorModal}
  >
    <Modal closeOnEsc={false}>
      <ModalRef bind:open />
      <div class="jse-main" class:jse-focus={hasFocus}>
        {#key instanceId}
          <JSONEditorRoot
            bind:this={refJSONEditorRoot}
            {mode}
            {content}
            {selection}
            {readOnly}
            {indentation}
            {tabSize}
            {statusBar}
            {askToFormat}
            {mainMenuBar}
            {navigationBar}
            {escapeControlCharacters}
            {escapeUnicodeCharacters}
            {flattenColumns}
            {parser}
            {parseMemoizeOne}
            {validator}
            {validationParser}
            {pathParser}
            insideModal={false}
            {onError}
            onChange={handleChange}
            onChangeMode={toggleMode}
            onSelect={handleSelect}
            {onRenderValue}
            {onClassName}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {onRenderMenu}
            {onRenderContextMenu}
            {onSortModal}
            {onTransformModal}
            {onJSONEditorModal}
          />
        {/key}
      </div>

      {#if sortModalProps}
        <SortModal {...sortModalProps} onClose={() => (sortModalProps = undefined)} />
      {/if}

      {#if transformModalProps}
        <TransformModal
          {...transformModalProps}
          onClose={() => (transformModalProps = undefined)}
        />
      {/if}
    </Modal>
  </Modal>
</AbsolutePopup>

<style src="./JSONEditor.scss"></style>
