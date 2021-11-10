<svelte:options immutable={true} />

<script>
  import { uniqueId } from '../../utils/uniqueId.js'
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import { debounce, isEmpty } from 'lodash-es'
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { DEBOUNCE_DELAY, MAX_PREVIEW_CHARACTERS } from '../../constants.js'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { stringifyPath } from '../../utils/pathUtils.js'
  import { truncate } from '../../utils/stringUtils.js'
  import Header from './Header.svelte'
  import { transformModalState } from './transformModalState.js'
  import TransformWizard from './TransformWizard.svelte'

  export let id = 'transform-modal-' + uniqueId()
  export let json
  export let selectedPath = []

  /** @type {QueryLanguage[]} */
  export let queryLanguages

  /** @type {string} */
  export let queryLanguageId

  /** @type {(queryLanguageId: string) => void} */
  export let onChangeQueryLanguage // TODO: implement a dropdown to change the selected query language

  export let onTransform
  export let indentation = 2

  $: selectedJson = getIn(json, selectedPath)

  function getSelectedQueryLanguage() {
    // TODO: log a console warning when the queryLanguage is not found
    return queryLanguages.find((item) => item.id === queryLanguageId) || queryLanguages[0]
  }

  const { close } = getContext('simple-modal')

  const stateId = `${id}:${compileJSONPointer(selectedPath)}`

  const state = transformModalState[stateId] || {}

  let query = state.query || getSelectedQueryLanguage().createQuery(json, {})
  let previewHasError = false
  let preview = ''

  // showWizard is not stored inside a stateId
  let showWizard = transformModalState.showWizard !== false

  let filterField = state.filterField || null
  let filterRelation = state.filterRelation || null
  let filterValue = state.filterValue || null
  let sortField = state.sortField || null
  let sortDirection = state.sortDirection || null
  let pickFields = state.pickFields || null

  function updateQuery(newQuery) {
    // console.log('updated query by wizard', newQuery)
    query = newQuery
  }

  function previewTransform(json, query) {
    try {
      const jsonTransformed = getSelectedQueryLanguage().executeQuery(json, query)

      preview = truncate(JSON.stringify(jsonTransformed, null, indentation), MAX_PREVIEW_CHARACTERS)
      previewHasError = false
    } catch (err) {
      preview = err.toString()
      previewHasError = true
    }
  }

  const previewTransformDebounced = debounce(previewTransform, DEBOUNCE_DELAY)

  $: {
    previewTransformDebounced(selectedJson, query)
  }

  function handleTransform() {
    try {
      const jsonTransformed = getSelectedQueryLanguage().executeQuery(selectedJson, query)

      onTransform([
        {
          op: 'replace',
          path: compileJSONPointer(selectedPath),
          value: jsonTransformed
        }
      ])

      // remember the selected values for the next time we open the SortModal
      // just in memory, not persisted
      transformModalState[stateId] = {
        query,
        filterField,
        filterRelation,
        filterValue,
        sortField,
        sortDirection,
        pickFields
      }

      close()
    } catch (err) {
      // this should never occur since we can only press the Transform
      // button when creating a preview was successful
      console.error(err)
      preview = err.toString()
      previewHasError = true
    }
  }

  function toggleShowWizard() {
    showWizard = !showWizard

    // not stored inside a stateId
    transformModalState.showWizard = showWizard
  }

  function focus(element) {
    element.focus()
  }
</script>

<div class="jsoneditor-modal transform">
  <Header title="Transform" />
  <div class="contents">
    <div class="description">
      {@html getSelectedQueryLanguage().description}
    </div>

    <div class="label">Path</div>
    <input
      class="path"
      type="text"
      readonly
      title="Selected path"
      value={!isEmpty(selectedPath) ? stringifyPath(selectedPath) : '(whole document)'}
    />

    <div class="label">
      <button type="button" on:click={toggleShowWizard}>
        <Icon data={showWizard ? faCaretDown : faCaretRight} />
        Wizard
      </button>
    </div>
    {#if showWizard}
      {#if Array.isArray(selectedJson)}
        <TransformWizard
          bind:filterField
          bind:filterRelation
          bind:filterValue
          bind:sortField
          bind:sortDirection
          bind:pickFields
          json={selectedJson}
          onQuery={updateQuery}
          createQuery={getSelectedQueryLanguage().createQuery}
        />
      {:else}
        (Only available for arrays, not for objects)
      {/if}
    {/if}

    <div class="label">Query</div>
    <textarea class="query" spellcheck="false" bind:value={query} />

    <div class="label">Preview</div>
    <textarea class="preview" class:error={previewHasError} bind:value={preview} readonly />

    <div class="actions">
      <button
        type="button"
        class="primary"
        on:click={handleTransform}
        use:focus
        disabled={previewHasError}
      >
        Transform
      </button>
    </div>
  </div>
</div>

<style src="./TransformModal.scss"></style>
