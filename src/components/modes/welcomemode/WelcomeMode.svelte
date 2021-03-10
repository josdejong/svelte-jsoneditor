<script>
  // TODO: there is a lot of copy-paste from TreeMode in this component. Extract reusable parts in separate componentss

  import { faPaste, faPlus } from '@fortawesome/free-solid-svg-icons'
  import { getContext, onDestroy, onMount } from 'svelte'
  import { SIMPLE_MODAL_OPTIONS } from '../../../constants.js'
  import {
    activeElementIsChildOf,
    getWindow,
    isChildOfNodeName
  } from '../../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Menu from '../../controls/Menu.svelte'
  import CopyPasteModal from '../../modals/CopyPasteModal.svelte'

  const { open } = getContext('simple-modal')

  export let onChange
  export let onFocus
  export let onBlur
  export let onRenderMenu = () => {}
  export let readOnly = false

  let domWelcomeMode
  let domHiddenInput
  let hasFocus = false

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domWelcomeMode),
    hasFocus: () => activeElementIsChildOf(domWelcomeMode),
    onFocus: () => {
      hasFocus = true
      if (onFocus) {
        onFocus()
      }
    },
    onBlur: () => {
      hasFocus = false
      if (onBlur) {
        onBlur()
      }
    }
  })

  function handlePasteFromMenu () {
    open(CopyPasteModal, {}, {
      ...SIMPLE_MODAL_OPTIONS,
      styleWindow: {
        ...SIMPLE_MODAL_OPTIONS.styleWindow,
        width: '450px'
      }
    }, {
      onClose: () => setTimeout(onFocus)
    })
  }

  function handleInsertObject () {
    onChange('{}')
  }

  function handleInsertArray () {
    onChange('[]')
  }

  function handleInsertValue () {
    onChange('""')
  }

  function handleKeyDown (event) {
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    if (combo === '{') {
      handleInsertObject()
    } else if (combo === '[') {
      handleInsertArray()
    }
  }

  function handleMouseDown (event) {
    // TODO: ugly to have to have two setTimeout here. Without it, hiddenInput will blur
    setTimeout(() => {
      setTimeout(() => {
        if (!hasFocus && !isChildOfNodeName(event.target, 'BUTTON')) {
          // for example when clicking on the empty area in the main menu
          focus()
        }
      })
    })
  }

  function handlePaste (event) {
    onChange(event.clipboardData.getData('text/plain'))
  }

  export function focus () {
    // with just .focus(), sometimes the input doesn't react on onpaste events
    // in Chrome when having a large document open and then doing cut/paste.
    // Calling both .focus() and .select() did solve this issue.
    domHiddenInput.focus()
    domHiddenInput.select()
  }

  const defaultItems = [
    {
      icon: faPaste,
      title: 'Paste (Ctrl+V)',
      className: 'paste',
      onClick: handlePasteFromMenu,
      disabled: readOnly
    },
    {
      separator: true
    },
    {
      icon: faPlus,
      title: 'Insert new structure (Insert)',
      className: 'insert',
      onClick: handleInsertObject,
      disabled: readOnly,
      items: [ // type: MenuDropdownItem[]
        {
          text: 'Insert value',
          title: 'Insert a new value',
          onClick: handleInsertValue,
          disabled: readOnly,
          default: true
        },
        {
          text: 'Insert object',
          title: 'Insert a new object',
          onClick: handleInsertObject,
          disabled: readOnly
        },
        {
          text: 'Insert array',
          title: 'Insert a new array',
          onClick: handleInsertArray,
          disabled: readOnly
        }
      ]
    }
  ]


  $: items = onRenderMenu('tree', defaultItems) || defaultItems
</script>


<div
  class="welcome-mode"
  on:keydown={handleKeyDown}
  on:mousedown={handleMouseDown}
  bind:this={domWelcomeMode}
>
  <Menu items={items} />
  <label class="hidden-input-label">
    <input
      class="hidden-input"
      tabindex="-1"
      bind:this={domHiddenInput}
      on:paste={handlePaste}
    />
  </label>
  <div class="welcome">
    <div class="space before"></div>
    <div class="contents">
      New document
      <ul>
        <li>Click inside the editor</li>
        <li>Paste clipboard data using <span class="bold">Ctrl+V</span></li>
        <li>Create a new object by typing <span class="bold">&lbrace;</span></li>
        <li>Create a new array by typing <span class="bold">[</span></li>
      </ul>
    </div>
    <div class="space after"></div>
  </div>
</div>


<style src="./WelcomeMode.scss"></style>
