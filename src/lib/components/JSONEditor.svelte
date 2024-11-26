<svelte:options accessors={false} immutable={true} />

<script lang="ts">
  import { createDebug } from '../utils/debug.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import { isEqualParser, isJSONContent, validateContentType } from '../utils/jsonUtils.js'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import { jsonQueryLanguage } from '$lib/plugins/query/jsonQueryLanguage.js'
  import { renderValue } from '$lib/plugins/value/renderValue.js'
  import { tick } from 'svelte'
  import TransformModal from './modals/TransformModal.svelte'
  import type {
    Content,
    ContentErrors,
    ContextMenuItem,
    JSONEditorModalCallback,
    JSONEditorModalProps,
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
    SortModalCallback,
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
  import { cloneDeep } from 'lodash-es'
  import SortModal from './modals/SortModal.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:JSONEditor')

  const contentDefault = { text: '' }
  const selectionDefault = undefined
  const readOnlyDefault = false
  const indentationDefault = 2
  const tabSizeDefault = 4
  const modeDefault = Mode.tree
  const mainMenuBarDefault = true
  const navigationBarDefault = true
  const statusBarDefault = true
  const askToFormatDefault = true
  const escapeControlCharactersDefault = false
  const escapeUnicodeCharactersDefault = false
  const flattenColumnsDefault = true
  const parserDefault = JSON
  const validatorDefault = undefined
  const validationParserDefault = JSON
  const pathParserDefault = {
    parse: parseJSONPath,
    stringify: stringifyJSONPath
  }
  const queryLanguagesDefault = [jsonQueryLanguage]
  const queryLanguageIdDefault = queryLanguagesDefault[0].id
  const onChangeQueryLanguageDefault = noop
  const onChangeDefault = undefined
  const onSelectDefault = undefined
  const onRenderValueDefault = renderValue
  const onClassNameDefault = noop
  const onRenderMenuDefault = noop
  const onRenderContextMenuDefault = noop
  const onChangeModeDefault = noop
  const onErrorDefault: OnError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  const onFocusDefault = noop
  const onBlurDefault = noop

  export let content: Content = contentDefault
  export let selection: JSONEditorSelection | undefined = selectionDefault
  export let readOnly: boolean = readOnlyDefault
  export let indentation: number | string = indentationDefault
  export let tabSize: number = tabSizeDefault
  export let mode: Mode = modeDefault
  export let mainMenuBar: boolean = mainMenuBarDefault
  export let navigationBar: boolean = navigationBarDefault
  export let statusBar: boolean = statusBarDefault
  export let askToFormat: boolean = askToFormatDefault
  export let escapeControlCharacters: boolean = escapeControlCharactersDefault
  export let escapeUnicodeCharacters: boolean = escapeUnicodeCharactersDefault
  export let flattenColumns: boolean = flattenColumnsDefault
  export let parser: JSONParser = parserDefault
  export let validator: Validator | undefined = validatorDefault
  export let validationParser: JSONParser = validationParserDefault
  export let pathParser: JSONPathParser = pathParserDefault
  export let queryLanguages: QueryLanguage[] = queryLanguagesDefault
  export let queryLanguageId: string = queryLanguageIdDefault
  export let onChangeQueryLanguage: OnChangeQueryLanguage = onChangeQueryLanguageDefault
  export let onChange: OnChange | undefined = onChangeDefault
  export let onSelect: OnSelect | undefined = onSelectDefault
  export let onRenderValue: OnRenderValue = onRenderValueDefault
  export let onClassName: OnClassName = onClassNameDefault
  export let onRenderMenu: OnRenderMenu = onRenderMenuDefault
  export let onRenderContextMenu: OnRenderContextMenu = onRenderContextMenuDefault
  export let onChangeMode: OnChangeMode = onChangeModeDefault
  export let onError: OnError = onErrorDefault
  export let onFocus: OnFocus = onFocusDefault
  export let onBlur: OnBlur = onBlurDefault

  let instanceId = uniqueId()
  let hasFocus = false
  let refJSONEditorRoot: JSONEditorRoot
  let jsonEditorModalProps: JSONEditorModalProps | undefined = undefined
  let sortModalProps: SortModalCallback | undefined
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
    const names = Object.keys(props) as (keyof JSONEditorPropsOptional)[]

    for (const name of names) {
      switch (name) {
        case 'content':
          content = props[name] ?? contentDefault
          break
        case 'selection':
          selection = props[name] ?? selectionDefault
          break
        case 'readOnly':
          readOnly = props[name] ?? readOnlyDefault
          break
        case 'indentation':
          indentation = props[name] ?? indentationDefault
          break
        case 'tabSize':
          tabSize = props[name] ?? tabSizeDefault
          break
        case 'mode':
          mode = props[name] ?? modeDefault
          break
        case 'mainMenuBar':
          mainMenuBar = props[name] ?? mainMenuBarDefault
          break
        case 'navigationBar':
          navigationBar = props[name] ?? navigationBarDefault
          break
        case 'statusBar':
          statusBar = props[name] ?? statusBarDefault
          break
        case 'askToFormat':
          askToFormat = props[name] ?? askToFormatDefault
          break
        case 'escapeControlCharacters':
          escapeControlCharacters = props[name] ?? escapeControlCharactersDefault
          break
        case 'escapeUnicodeCharacters':
          escapeUnicodeCharacters = props[name] ?? escapeUnicodeCharactersDefault
          break
        case 'flattenColumns':
          flattenColumns = props[name] ?? flattenColumnsDefault
          break
        case 'parser':
          parser = props[name] ?? parserDefault
          break
        case 'validator':
          validator = props[name] ?? validatorDefault
          break
        case 'validationParser':
          validationParser = props[name] ?? validationParserDefault
          break
        case 'pathParser':
          pathParser = props[name] ?? pathParserDefault
          break
        case 'queryLanguages':
          queryLanguages = props[name] ?? queryLanguagesDefault
          break
        case 'queryLanguageId':
          queryLanguageId = props[name] ?? queryLanguageIdDefault
          break
        case 'onChangeQueryLanguage':
          onChangeQueryLanguage = props[name] ?? onChangeQueryLanguageDefault
          break
        case 'onChange':
          onChange = props[name] ?? onChangeDefault
          break
        case 'onRenderValue':
          onRenderValue = props[name] ?? onRenderValueDefault
          break
        case 'onClassName':
          onClassName = props[name] ?? onClassNameDefault
          break
        case 'onRenderMenu':
          onRenderMenu = props[name] ?? onRenderMenuDefault
          break
        case 'onRenderContextMenu':
          onRenderContextMenu = props[name] ?? onRenderContextMenuDefault
          break
        case 'onChangeMode':
          onChangeMode = props[name] ?? onChangeModeDefault
          break
        case 'onSelect':
          onSelect = props[name] ?? onSelectDefault
          break
        case 'onError':
          onError = props[name] ?? onErrorDefault
          break
        case 'onFocus':
          onFocus = props[name] ?? onFocusDefault
          break
        case 'onBlur':
          onBlur = props[name] ?? onBlurDefault
          break

        default:
          // We should never reach this default case
          unknownProperty(name)
      }
    }

    if (!queryLanguages.some((queryLanguage) => queryLanguage.id === queryLanguageId)) {
      queryLanguageId = queryLanguages[0].id
    }

    function unknownProperty(name: never) {
      debug(`Unknown property "${name}"`)
    }

    await tick() // await rerender
  }

  export async function destroy() {
    throw new Error(
      'class method destroy() is deprecated. ' +
        'It is replaced with a method destroy() in the vanilla library.'
    )
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
  function onSortModal(props: SortModalCallback) {
    if (readOnly) {
      return
    }

    sortModalProps = props
  }

  // The onJSONEditorModal method is located in JSONEditor to prevent circular references:
  //     JSONEditor -> TableMode -> JSONEditorModal -> JSONEditor
  function onJSONEditorModal({ content, path, onPatch, onClose }: JSONEditorModalCallback) {
    debug('onJSONEditorModal', { content, path })

    jsonEditorModalProps = {
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
      onTransformModal,
      onClose
    }
  }

  $: debug('mode changed to', mode)
</script>

<AbsolutePopup>
  <div class="jse-main" class:jse-focus={hasFocus}>
    {#key instanceId}
      <JSONEditorRoot
        bind:this={refJSONEditorRoot}
        externalMode={mode}
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
    <SortModal
      {...sortModalProps}
      onClose={() => {
        sortModalProps?.onClose()
        sortModalProps = undefined
      }}
    />
  {/if}

  {#if transformModalProps}
    <TransformModal
      {...transformModalProps}
      onClose={() => {
        transformModalProps?.onClose()
        transformModalProps = undefined
      }}
    />
  {/if}

  {#if jsonEditorModalProps}
    <JSONEditorModal
      {...jsonEditorModalProps}
      onClose={() => {
        jsonEditorModalProps?.onClose()
        jsonEditorModalProps = undefined
      }}
    />
  {/if}
</AbsolutePopup>

<style src="./JSONEditor.scss"></style>
