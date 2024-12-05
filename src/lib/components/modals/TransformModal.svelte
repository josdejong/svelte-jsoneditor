<svelte:options immutable={true} />

<script lang="ts">
  import { uniqueId } from '$lib/utils/uniqueId.js'
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import { debounce, isEmpty, noop } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { DEBOUNCE_DELAY } from '$lib/constants.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { transformModalStates, transformModalStateShared } from './transformModalStates.js'
  import TransformWizard from './TransformWizard.svelte'
  import TransformModalHeader from './TransformModalHeader.svelte'
  import AbsolutePopup from './popup/AbsolutePopup.svelte'
  import { createDebug } from '$lib/utils/debug.js'
  import TreeMode from '../modes/treemode/TreeMode.svelte'
  import type {
    Content,
    HistoryItem,
    History,
    JSONParser,
    JSONPathParser,
    OnChangeQueryLanguage,
    OnClassName,
    OnRenderContextMenuInternal,
    OnRenderMenuInternal,
    OnRenderValue,
    QueryLanguage,
    QueryLanguageOptions
  } from '$lib/types.js'
  import { onEscape } from '$lib/actions/onEscape.js'
  import { readonlyProxy } from '$lib/utils/readonlyProxy.js'
  import Modal from './Modal.svelte'
  import { onMount } from 'svelte'
  import { createHistoryInstance } from '$lib/logic/history'

  const debug = createDebug('jsoneditor:TransformModal')

  export let id = 'transform-modal-' + uniqueId()
  export let json: unknown
  export let rootPath: JSONPath = []

  export let indentation: number | string
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let parseMemoizeOne: JSONParser['parse']
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser

  export let queryLanguages: QueryLanguage[]
  export let queryLanguageId: string
  export let onChangeQueryLanguage: OnChangeQueryLanguage

  export let onRenderValue: OnRenderValue
  export let onRenderMenu: OnRenderMenuInternal
  export let onRenderContextMenu: OnRenderContextMenuInternal
  export let onClassName: OnClassName

  export let onTransform: (operations: JSONPatchDocument) => void
  export let onClose: () => void

  let refQueryInput: HTMLTextAreaElement

  const historyInstance = createHistoryInstance<HistoryItem>({
    onChange: (updatedHistory) => (history = updatedHistory)
  })

  let history: History<HistoryItem> = historyInstance.get()

  let selectedJson: unknown | undefined
  $: selectedJson = readonlyProxy(getIn(json, rootPath))
  let selectedContent: Content
  $: selectedContent = selectedJson ? { json: selectedJson } : { text: '' }

  let fullscreen = false

  const stateId = `${id}:${compileJSONPointer(rootPath)}`
  const state = transformModalStates[stateId] ?? {}

  // showWizard is not stored inside a stateId
  let showWizard = transformModalStateShared.showWizard !== false
  let showOriginal = transformModalStateShared.showOriginal !== false

  let queryOptions = state.queryOptions ?? {}
  let query = queryLanguageId === state.queryLanguageId && state.query ? state.query : ''
  let isManual = state.isManual ?? false
  let queryError: string | undefined = undefined

  let previewError: string | undefined = undefined
  let previewContent: Content = { text: '' }

  if (!isManual) {
    updateQueryByWizard(queryOptions)
  }

  onMount(() => {
    refQueryInput?.focus()
  })

  function getSelectedQueryLanguage(queryLanguageId: string): QueryLanguage {
    return queryLanguages.find((item) => item.id === queryLanguageId) ?? queryLanguages[0]
  }

  function updateQueryByWizard(newQueryOptions: QueryLanguageOptions) {
    try {
      queryOptions = newQueryOptions

      query = getSelectedQueryLanguage(queryLanguageId).createQuery(selectedJson, newQueryOptions)
      queryError = undefined
      isManual = false

      debug('updateQueryByWizard', { queryOptions, query, isManual })
    } catch (err) {
      queryError = String(err)
    }
  }

  function handleChangeQuery(event: Event) {
    query = (event.target as HTMLTextAreaElement).value
    isManual = true
    debug('handleChangeQuery', { query, isManual })
  }

  function previewTransform(previewJson: unknown | undefined, query: string) {
    if (previewJson === undefined) {
      previewContent = { text: '' }
      previewError = 'Error: No JSON'
      return
    }

    if (query.trim() === '') {
      previewContent = { json: previewJson }
      return
    }

    try {
      debug('previewTransform', {
        query
      })

      const jsonTransformed = getSelectedQueryLanguage(queryLanguageId).executeQuery(
        previewJson,
        query,
        parser
      )

      previewContent = { json: jsonTransformed }
      previewError = undefined
    } catch (err) {
      previewContent = { text: '' }
      previewError = String(err)
    }
  }

  const previewTransformDebounced = debounce(previewTransform, DEBOUNCE_DELAY)

  $: {
    previewTransformDebounced(selectedJson, query)
  }

  $: {
    // remember the selected values for the next time we open the SortModal
    // just in memory, not persisted
    transformModalStates[stateId] = {
      queryOptions,
      query,
      queryLanguageId,
      isManual
    }

    debug('store state in memory', stateId, transformModalStates[stateId])
  }

  function handleTransform() {
    if (selectedJson === undefined) {
      previewContent = { text: '' }
      previewError = 'Error: No JSON'
      return
    }

    try {
      debug('handleTransform', { query })
      const jsonTransformed = getSelectedQueryLanguage(queryLanguageId).executeQuery(
        selectedJson,
        query,
        parser
      )

      onTransform([
        {
          op: 'replace',
          path: compileJSONPointer(rootPath),
          value: jsonTransformed
        }
      ])

      onClose()
    } catch (err) {
      // this should never occur since we can only press the Transform
      // button when creating a preview was successful
      console.error(err)
      previewContent = { text: '' }
      previewError = String(err)
    }
  }

  function toggleShowWizard() {
    showWizard = !showWizard

    // not stored inside a stateId
    transformModalStateShared.showWizard = showWizard
  }

  function toggleShowOriginal() {
    showOriginal = !showOriginal

    // not stored inside a stateId
    transformModalStateShared.showOriginal = showOriginal
  }

  function focus(element: HTMLElement) {
    element.focus()
  }

  function handleChangeQueryLanguage(newQueryLanguageId: string) {
    debug('handleChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)

    updateQueryByWizard(queryOptions)
  }

  function handleEscape() {
    if (fullscreen) {
      fullscreen = !fullscreen
    } else {
      onClose()
    }
  }
</script>

<Modal {onClose} className="jse-transform-modal" {fullscreen}>
  <div class="jse-transform-modal-inner" use:onEscape={handleEscape}>
    <AbsolutePopup>
      <TransformModalHeader
        {queryLanguages}
        {queryLanguageId}
        onChangeQueryLanguage={handleChangeQueryLanguage}
        {onClose}
        bind:fullscreen
      />
      <div class="jse-modal-contents">
        <div class="jse-main-contents">
          <div class="jse-query-contents">
            <div class="jse-label">
              <div class="jse-label-inner">Language</div>
            </div>
            <div class="jse-description">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html getSelectedQueryLanguage(queryLanguageId).description}
            </div>

            <div class="jse-label">
              <div class="jse-label-inner">Path</div>
            </div>
            <input
              class="jse-path"
              type="text"
              readonly
              title="Selected path"
              value={!isEmpty(rootPath) ? stringifyJSONPath(rootPath) : '(document root)'}
            />

            <div class="jse-label">
              <div class="jse-label-inner">
                <button type="button" on:click={toggleShowWizard}>
                  <Icon data={showWizard ? faCaretDown : faCaretRight} />
                  Wizard
                </button>
              </div>
            </div>
            {#if showWizard}
              {#if Array.isArray(selectedJson)}
                <TransformWizard
                  {queryOptions}
                  json={selectedJson}
                  onChange={updateQueryByWizard}
                />
                {#if queryError}
                  <div class="query-error">
                    {queryError}
                  </div>
                {/if}
              {:else}
                (Only available for arrays, not for objects)
              {/if}
            {/if}

            <div class="jse-label">
              <div class="jse-label-inner">Query</div>
            </div>
            <textarea
              bind:this={refQueryInput}
              class="jse-query"
              spellcheck="false"
              on:input={handleChangeQuery}>{query}</textarea
            >
          </div>
          <div class="jse-data-contents" class:jse-hide-original-data={!showOriginal}>
            <div class="jse-original-data" class:jse-hide={!showOriginal}>
              <div class="jse-label">
                <div class="jse-label-inner">
                  <button type="button" on:click={toggleShowOriginal}>
                    <Icon data={showOriginal ? faCaretDown : faCaretRight} />
                    Original
                  </button>
                </div>
              </div>
              {#if showOriginal}
                <TreeMode
                  externalContent={selectedContent}
                  externalSelection={undefined}
                  {history}
                  readOnly={true}
                  mainMenuBar={false}
                  navigationBar={false}
                  {indentation}
                  {escapeControlCharacters}
                  {escapeUnicodeCharacters}
                  {parser}
                  {parseMemoizeOne}
                  {onRenderValue}
                  {onRenderMenu}
                  {onRenderContextMenu}
                  onError={console.error}
                  onChange={noop}
                  onChangeMode={noop}
                  onSelect={noop}
                  onUndo={noop}
                  onRedo={noop}
                  onFocus={noop}
                  onBlur={noop}
                  onSortModal={noop}
                  onTransformModal={noop}
                  onJSONEditorModal={noop}
                  {onClassName}
                  validator={undefined}
                  {validationParser}
                  {pathParser}
                />
              {/if}
            </div>
            <div class="jse-preview-data">
              <div class="jse-label">
                <div class="jse-label-inner">Preview</div>
              </div>
              {#if !previewError}
                <TreeMode
                  externalContent={previewContent}
                  externalSelection={undefined}
                  {history}
                  readOnly={true}
                  mainMenuBar={false}
                  navigationBar={false}
                  {indentation}
                  {escapeControlCharacters}
                  {escapeUnicodeCharacters}
                  {parser}
                  {parseMemoizeOne}
                  {onRenderValue}
                  {onRenderMenu}
                  {onRenderContextMenu}
                  onError={console.error}
                  onChange={noop}
                  onChangeMode={noop}
                  onSelect={noop}
                  onUndo={noop}
                  onRedo={noop}
                  onFocus={noop}
                  onBlur={noop}
                  onSortModal={noop}
                  onTransformModal={noop}
                  onJSONEditorModal={noop}
                  {onClassName}
                  validator={undefined}
                  {validationParser}
                  {pathParser}
                />
              {:else}
                <div class="jse-preview jse-error">
                  {previewError}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="jse-actions">
          <button
            type="button"
            class="jse-primary"
            on:click={handleTransform}
            use:focus
            disabled={!!previewError}
          >
            Transform
          </button>
        </div>
      </div>
    </AbsolutePopup>
  </div>
</Modal>

<style src="./TransformModal.scss"></style>
