<script>
  import {
    faArrowDown,
    faCheck,
    faExclamationTriangle,
    faTimes,
    faWrench
  } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import { onDestroy, onMount } from 'svelte'
  import Icon from 'svelte-awesome'
  import { MODE } from '../../constants.js'
  import { activeElementIsChildOf, getWindow } from '../../utils/domUtils.js'
  import { normalizeJsonParseError } from '../../utils/jsonUtils.js'
  import { createFocusTracker } from '../controls/createFocusTracker.js'

  export let text = ''
  export let mode = MODE.EDIT
  export let onParse
  export let onRepair
  export let onChange = null
  export let onApply
  export let onCancel
  export let onFocus
  export let onBlur

  const debug = createDebug('jsoneditor:JSONRepair')

  let domJsonRepair
  let domTextArea

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domJsonRepair),
    hasFocus: () => activeElementIsChildOf(domJsonRepair),
    onFocus: () => {
      if (onFocus) {
        onFocus()
      }
    },
    onBlur: () => {
      if (onBlur) {
        onBlur()
      }
    }
  })


  $: readOnly = mode === MODE.VIEW
  $: error = getErrorMessage(text)
  $: repairable = isRepairable(text)

  $: debug('error', error)

  function getErrorMessage (jsonText) {
    try {
      onParse(jsonText)
      return null
    } catch (err) {
      return normalizeJsonParseError(jsonText, err.message)
    }
  }

  function isRepairable (jsonText) {
    try {
      onRepair(jsonText)
      return true
    } catch (err) {
      return false
    }
  }

  function goToError () {
    if (domTextArea && error && error.position != null) {
      domTextArea.setSelectionRange(error.position, error.position)
      setTimeout(() => {
        domTextArea.focus()
      })
    }
  }

  function handleChange (event) {
    debug('handleChange')

    const value = event.target.value

    if (text === value) {
      return
    }

    text = value

    if (onChange) {
      onChange(text)
    }
  }

  function handleApply () {
    onApply(text)
  }

  function handleRepair () {
    try {
      // TODO: simpleJsonRepair should also partially apply fixes. Now it's all or nothing
      text = onRepair(text)

      if (onChange) {
        onChange(text)
      }
    } catch (err) {
      // no need to do something with the error
    }
  }
</script>

<div
  class="json-repair"
  bind:this={domJsonRepair}
>
  <div class="menu">
    <div class="info">
      Repair invalid JSON, then click apply
    </div>
    <div class="space"></div>
    <button
      class="button"
      title="Cancel repair"
      on:click={onCancel}
    >
      <Icon data={faTimes} />
    </button>
  </div>
  {#if error}
    <div class="json-repair-error">
      <div class="message">
        <Icon data={faExclamationTriangle} /> Cannot parse JSON: {error.message}.
      </div>
      <div class="actions">
        <button
          on:click={goToError}
          class="button primary action"
          title="Scroll to the error location"
        >
          <Icon data={faArrowDown} /> Show me
        </button>
        {#if repairable}
          <button
            on:click={handleRepair}
            class="button primary action"
            title="Automatically repair JSON"
            disabled={readOnly}
          >
            <Icon data={faWrench}/> Auto repair
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="json-repair-valid">
      <div class="message">
        JSON is valid now and can be parsed.
      </div>
      <div class="actions">
        <button
          on:click={handleApply}
          class="button primary action"
          title="Apply fixed JSON"
          disabled={readOnly}
        >
          <Icon data={faCheck} /> Apply
        </button>
      </div>
    </div>
  {/if}
  <textarea
    bind:this={domTextArea}
    value={text}
    on:input={handleChange}
    readonly={readOnly}
    class="json-text"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  ></textarea>
</div>

<style src="./JSONRepairEditor.scss"></style>
