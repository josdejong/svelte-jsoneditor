<svelte:options immutable={true} />

<script lang="ts">
  import { uniqueId } from '../../utils/uniqueId.js'
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import { debounce, isEmpty, noop } from 'lodash-es'
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { DEBOUNCE_DELAY } from '../../constants.js'
  import type { JSONPath } from 'immutable-json-patch'
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
    JSONParser,
    JSONPathParser,
    OnChangeQueryLanguage,
    OnClassName,
    OnPatch,
    OnRenderContextMenuInternal,
    OnRenderMenuInternal,
    OnRenderValue,
    QueryLanguage,
    QueryLanguageOptions
  } from '$lib/types.js'
  import { onEscape } from '$lib/actions/onEscape.js'
  import type { Context } from 'svelte-simple-modal'

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

  export let onTransform: OnPatch

  let selectedJson: unknown | undefined
  $: selectedJson = getIn(json, rootPath)
  let selectedContent: Content
  $: selectedContent = selectedJson ? { json: selectedJson } : { text: '' }

  const { close } = getContext<Context>('simple-modal')

  const stateId = `${id}:${compileJSONPointer(rootPath)}`

  const state = transformModalStates[stateId] || {}

  // showWizard is not stored inside a stateId
  let showWizard = transformModalStateShared.showWizard !== false
  let showOriginal = transformModalStateShared.showOriginal !== false

  let queryOptions = state.queryOptions || {}
  let query =
    queryLanguageId === state.queryLanguageId && state.query
      ? state.query
      : getSelectedQueryLanguage(queryLanguageId).createQuery(json, state.queryOptions || {})
  let isManual = state.isManual || false

  let previewError: string | undefined = undefined
  let previewContent: Content = { text: '' }

  function getSelectedQueryLanguage(queryLanguageId: string): QueryLanguage {
    return queryLanguages.find((item) => item.id === queryLanguageId) || queryLanguages[0]
  }

  function updateQueryByWizard(newQueryOptions: QueryLanguageOptions) {
    queryOptions = newQueryOptions
    query = getSelectedQueryLanguage(queryLanguageId).createQuery(json, newQueryOptions)
    isManual = false

    debug('updateQueryByWizard', { queryOptions, query, isManual })
  }

  function handleChangeQuery(event: Event) {
    query = (event.target as HTMLTextAreaElement).value
    isManual = true
    debug('handleChangeQuery', { query, isManual })
  }

  function previewTransform(json: unknown | undefined, query: string) {
    if (json === undefined) {
      previewContent = { text: '' }
      previewError = 'Error: No JSON'
      return
    }

    try {
      debug('previewTransform', {
        query
      })

      const jsonTransformed = getSelectedQueryLanguage(queryLanguageId).executeQuery(
        json,
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

      close()
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

    const newSelectedQueryLanguage = getSelectedQueryLanguage(queryLanguageId)
    query = newSelectedQueryLanguage.createQuery(json, queryOptions)
    isManual = false
  }
</script>

<div class="jse-modal jse-transform" use:onEscape={close}>
  <AbsolutePopup>
    <TransformModalHeader
      {queryLanguages}
      {queryLanguageId}
      onChangeQueryLanguage={handleChangeQueryLanguage}
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
              <TransformWizard {queryOptions} json={selectedJson} onChange={updateQueryByWizard} />
            {:else}
              (Only available for arrays, not for objects)
            {/if}
          {/if}

          <div class="jse-label">
            <div class="jse-label-inner">Query</div>
          </div>
          <textarea class="jse-query" spellcheck="false" on:input={handleChangeQuery}
            >{query}</textarea
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
                externalSelection={null}
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
                onFocus={noop}
                onBlur={noop}
                onSortModal={noop}
                onTransformModal={noop}
                onJSONEditorModal={noop}
                {onClassName}
                validator={null}
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
                externalSelection={null}
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
                onFocus={noop}
                onBlur={noop}
                onSortModal={noop}
                onTransformModal={noop}
                onJSONEditorModal={noop}
                {onClassName}
                validator={null}
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

<style src="./TransformModal.scss"></style>
