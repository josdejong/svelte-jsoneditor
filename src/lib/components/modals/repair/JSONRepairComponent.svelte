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
  import type { MenuItem, ParseError } from '$lib/types.js'
  import { t } from '$lib/i18n/index.js'

  export let text = ''
  export let readOnly = false
  export let onParse: (text: string) => void
  export let onRepair: (text: string) => string
  export let onChange: ((updatedText: string) => void) | undefined = undefined
  export let onApply: (repairedText: string) => void
  export let onCancel: () => void

  const debug = createDebug('jsoneditor:JSONRepair')

  let domTextArea: HTMLTextAreaElement

  $: error = getErrorMessage(text)
  $: repairable = isRepairable(text)

  $: debug('error', error)

  function getErrorMessage(jsonText: string): ParseError | undefined {
    try {
      onParse(jsonText)
      return undefined
    } catch (err) {
      return normalizeJsonParseError(jsonText, (err as Error).message)
    }
  }

  function isRepairable(jsonText: string) {
    try {
      onRepair(jsonText)
      return true
    } catch {
      return false
    }
  }

  function goToError() {
    if (domTextArea && error) {
      const position = error.position !== undefined ? error.position : 0
      domTextArea.setSelectionRange(position, position)
      domTextArea.focus()
    }
  }

  function handleChange(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
    debug('handleChange')

    const value = (event.target as HTMLTextAreaElement).value

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
    } catch {
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
      title: $t('cancelRepair'),
      className: 'jse-cancel',
      onClick: onCancel
    }
  ]

  $: gotoAction = {
    icon: faArrowDown,
    text: $t('showMe'),
    title: $t('scrollToError'),
    onClick: goToError
  }

  $: repairAction = {
    icon: faWrench,
    text: $t('autoRepair'),
    title: $t('autoRepairJson'),
    onClick: handleRepair
  }

  $: errorActions = repairable ? [gotoAction, repairAction] : [gotoAction]

  $: successActions = [
    {
      icon: faCheck,
      text: $t('apply'),
      title: $t('applyFixedJson'),
      disabled: readOnly,
      onClick: handleApply
    }
  ]
</script>

<div class="jse-json-repair-component">
  <Menu {items}>
    <div slot="left" class="jse-info">{$t('repairInvalidJson')}</div>
  </Menu>

  {#if error}
    <Message
      type="error"
      icon={faExclamationTriangle}
      message={`${$t('cannotParseJson')}: ${error.message}`}
      actions={errorActions}
    />
  {:else}
    <Message type="success" message={$t('jsonIsValidNow')} actions={successActions} />
  {/if}
  <textarea
    bind:this={domTextArea}
    on:input={handleChange}
    readonly={readOnly}
    class="jse-json-text"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false">{text}</textarea
  >
</div>

<style src="./JSONRepairComponent.scss"></style>
