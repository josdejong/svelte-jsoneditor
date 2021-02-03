<script>
  import createDebug from 'debug'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import { uniqueId } from 'lodash-es'
  import { getContext } from 'svelte'
  import {
    SORT_MODAL_OPTIONS,
    TRANSFORM_MODAL_OPTIONS
  } from '../../constants.js'
  import SortModal from '../modals/SortModal.svelte'
  import TransformModal from '../modals/TransformModal.svelte'
  import CodeMenu from './CodeMenu.svelte'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2 // FIXME: make indentation configurable
  export let onError = (err) => console.error(err) // FIXME: show error to the user

  const debug = createDebug('jsoneditor:CodeMode')

  let canUndo = true // FIXME
  let canRedo = true // FIXME

  const { open } = getContext('simple-modal')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  /**
   * @param {JSONPatchDocument} operations
   */
  export function patch (operations) {
    debug('patch', operations)

    const json = JSON.parse(text)
    const updatedJson = immutableJSONPatch(json, operations)
    const undo = revertJSONPatch(json, operations)
    text = JSON.stringify(updatedJson, null, indentation)

    return {
      json,
      undo,
      redo: operations
    }
  }

  function handleFormat () {
    debug('format')
    try {
      const json = JSON.parse(text)
      text = JSON.stringify(json, null, indentation)
    } catch (err) {
      onError()
    }
  }

  function handleCompact () {
    debug('compact')
    try {
      const json = JSON.parse(text)
      text = JSON.stringify(json)
    } catch (err) {
      onError()
    }
  }

  function handleSort () {
    if (readOnly) {
      return
    }

    try {
      const json = JSON.parse(text)

      open(SortModal, {
        id: sortModalId,
        json,
        selectedPath: [],
        onSort: async (operations) => {
          debug('onSort', operations)
          patch(operations)
        }
      }, SORT_MODAL_OPTIONS, {
        // onClose: () => focus() // FIXME
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleTransform () {
    if (readOnly) {
      return
    }

    try {
      const json = JSON.parse(text)

      open(TransformModal, {
        id: transformModalId,
        json: json,
        selectedPath: [],
        onTransform: async (operations) => {
          debug('onTransform', operations)
          patch(operations)
        }
      }, TRANSFORM_MODAL_OPTIONS, {
        // onClose: () => focus() // FIXME
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleUndo () {
    // FIXME: implement undo
  }

  function handleRedo () {
    // FIXME: implement redo
  }
</script>

<div class="code-mode">
  {#if mainMenuBar}
    <CodeMenu
      readOnly={readOnly}
      onFormat={handleFormat}
      onCompact={handleCompact}
      onSort={handleSort}
      onTransform={handleTransform}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  {/if}
  <textarea bind:value={text}></textarea>
</div>

<style src="./CodeMode.scss"></style>
