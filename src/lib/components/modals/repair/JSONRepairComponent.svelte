<svelte:options immutable={true} />

<script lang="ts">
  import {
    faArrowDown,
    faCheck,
    faExclamationTriangle,
    faTimes,
    faWrench
  } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug.js'
  import Message from '../../controls/Message.svelte'
  import { normalizeJsonParseError } from '$lib/utils/jsonUtils.js'
  import Menu from '../../controls/Menu.svelte'
  import type { MenuItem } from '$lib/types.js'

  export let text = ''
  export let readOnly = false
  export let onParse
  export let onRepair
  export let onChange = null
  export let onApply
  export let onCancel

  const debug = createDebug('jsoneditor:JSONRepair')

  let domJsonRepair
  let domTextArea

  $: error = getErrorMessage(text)
  $: repairable = isRepairable(text)

  $: debug('error', error)

  function getErrorMessage(jsonText) {
    try {
      onParse(jsonText)
      return null
    } catch (err) {
      return normalizeJsonParseError(jsonText, err.message)
    }
  }

  function isRepairable(jsonText) {
    try {
      onRepair(jsonText)
      return true
    } catch (err) {
      return false
    }
  }

  function goToError() {
    if (domTextArea && error && error.position != null) {
      domTextArea.setSelectionRange(error.position, error.position)
      setTimeout(() => {
        domTextArea.focus()
      })
    }
  }

  function handleChange(event) {
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

  function handleApply() {
    onApply(text)
  }

  function handleRepair() {
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

  let items: MenuItem[]
  $: items = [
    {
      type: 'space'
    },
    {
      type: 'button',
      icon: faTimes,
      title: 'Cancel repair',
      className: 'jse-cancel',
      onClick: onCancel
    }
  ]

  $: gotoAction = {
    icon: faArrowDown,
    text: 'Show me',
    title: 'Scroll to the error location',
    onClick: goToError
  }

  $: repairAction = {
    icon: faWrench,
    text: 'Auto repair',
    title: 'Automatically repair JSON',
    onClick: handleRepair
  }

  $: errorActions = repairable ? [gotoAction, repairAction] : [gotoAction]

  $: successActions = [
    {
      icon: faCheck,
      text: 'Apply',
      title: 'Apply fixed JSON',
      disabled: readOnly,
      onClick: handleApply
    }
  ]
</script>

<div class="jse-json-repair-component" bind:this={domJsonRepair}>
  <Menu {items}>
    <div slot="left" class="jse-info">Repair invalid JSON, then click apply</div>
  </Menu>

  {#if error}
    <Message
      type="error"
      icon={faExclamationTriangle}
      message={`Cannot parse JSON: ${error.message}`}
      actions={errorActions}
    />
  {:else}
    <Message
      type="success"
      message="JSON is valid now and can be parsed."
      actions={successActions}
    />
  {/if}
  <textarea
    bind:this={domTextArea}
    value={text}
    on:input={handleChange}
    readonly={readOnly}
    class="jse-json-text"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
</div>

<style src="./JSONRepairComponent.scss"></style>
