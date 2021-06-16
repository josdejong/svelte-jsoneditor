<svelte:options immutable={true} />

<script>
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import classnames from 'classnames'
  import { compileJSONPointer, getIn } from 'immutable-json-patch'
  import { isEqual, last } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    HOVER_COLLECTION,
    HOVER_INSERT_AFTER,
    HOVER_INSERT_INSIDE,
    INDENTATION_WIDTH,
    INSERT_EXPLANATION,
    STATE_EXPANDED,
    STATE_ID,
    STATE_KEYS,
    STATE_VISIBLE_SECTIONS,
    VALIDATION_ERROR
  } from '../../../constants.js'
  import { getVisibleCaretPositions } from '../../../logic/documentState.js'
  import { rename } from '../../../logic/operations.js'
  import {
    isPathInsideSelection,
    SELECTION_TYPE
  } from '../../../logic/selection.js'
  import {
    getSelectionTypeFromTarget,
    isChildOfAttribute,
    isChildOfNodeName,
    isContentEditableDiv
  } from '../../../utils/domUtils.js'
  import { valueType } from '../../../utils/typeUtils.js'
  import CollapsedItems from './CollapsedItems.svelte'
  import ContextMenuButton from './contextmenu/ContextMenuButton.svelte'
  import JSONKey from './JSONKey.svelte'
  import JSONValue from './JSONValue.svelte'
  import { singleton } from './singleton.js'
  import ValidationError from './ValidationError.svelte'

  // eslint-disable-next-line no-undef-init
  export let value
  export let path
  export let state
  export let readOnly
  export let searchResult
  export let validationErrors
  export let onPatch
  export let onInsert
  export let onExpand
  export let onSelect
  export let onPasteJson
  export let onContextMenu
  export let onClassName

  /** @type {function (path: Path, section: Section)} */
  export let onExpandSection

  export let selection

  // TODO: this is not efficient. Create a nested object with the selection and pass that
  $: selected = (selection && selection.pathsMap)
    ? selection.pathsMap[compileJSONPointer(path)] === true
    : false

  $: selectedAfter = (selection && selection.type === SELECTION_TYPE.AFTER)
    ? isEqual(selection.focusPath, path)
    : false

  $: selectedInside = (selection && selection.type === SELECTION_TYPE.INSIDE)
    ? isEqual(selection.focusPath, path)
    : false

  $: selectedKey = (selection && selection.type === SELECTION_TYPE.KEY)
    ? isEqual(selection.focusPath, path)
    : false

  $: selectedValue = (selection && selection.type === SELECTION_TYPE.VALUE)
    ? isEqual(selection.focusPath, path)
    : false

  $: expanded = state[STATE_EXPANDED]
  $: visibleSections = state[STATE_VISIBLE_SECTIONS]
  $: keys = state[STATE_KEYS]
  $: validationError = validationErrors && validationErrors[VALIDATION_ERROR]
  $: root = path.length === 0

  let hover = null

  $: type = valueType(value)

  function getIndentationStyle (level) {
    return `margin-left: ${level * INDENTATION_WIDTH}px`
  }

  function toggleExpand (event) {
    event.stopPropagation()

    const recursive = event.ctrlKey
    onExpand(path, !expanded, recursive)
  }

  function handleExpand (event) {
    event.stopPropagation()

    onExpand(path, true)
  }

  function handleUpdateKey (oldKey, newKey) {
    const operations = rename(path, keys, oldKey, newKey)
    onPatch(operations)

    // It is possible that the applied key differs from newKey,
    // to prevent duplicate keys. Here we figure out the actually applied key
    const newKeyUnique = last(getIn(operations, [0, 'path']))

    return newKeyUnique
  }

  function handleMouseDown (event) {
    // check if the mouse down is not happening in the key or value input fields or on a button
    if (isContentEditableDiv(event.target) || isChildOfNodeName(event.target, 'BUTTON')) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    const anchorType = getSelectionTypeFromTarget(event.target)

    // when right clicking inside the current selection, do nothing
    if (event.button === 2 && selection && isPathInsideSelection(selection, path, anchorType)) {
      return
    }

    // TODO: implement start of a drag event when dragging selection with left mouse button

    singleton.mousedown = true
    singleton.selectionAnchor = path
    singleton.selectionAnchorType = anchorType
    singleton.selectionFocus = path

    if (event.shiftKey) {
      // Shift+Click will select multiple entries
      onSelect({
        type: SELECTION_TYPE.MULTI,
        anchorPath: selection.anchorPath,
        focusPath: path
      })
    } else {
      switch (anchorType) {
        case SELECTION_TYPE.KEY:
          onSelect({ type: SELECTION_TYPE.KEY, path })
          break

        case SELECTION_TYPE.VALUE:
          onSelect({ type: SELECTION_TYPE.VALUE, path })
          break

        case SELECTION_TYPE.MULTI:
          if (root && event.target.hasAttribute('data-path')) {
            const lastCaretPosition = last(getVisibleCaretPositions(value, state))
            onSelect(lastCaretPosition)
          } else {
            onSelect({
              type: SELECTION_TYPE.MULTI,
              anchorPath: path,
              focusPath: path
            })
          }
          break

        case SELECTION_TYPE.AFTER:
        case SELECTION_TYPE.INSIDE:
          // do nothing: event already handled by event listener on the element or component itself
          // TODO: move the logic here instead of in separate event listeners
          break
      }
    }

    // we attach the mouse up event listener to the global document,
    // so we will not miss if the mouse up is happening outside of the editor
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove (event) {
    if (singleton.mousedown) {
      event.preventDefault()
      event.stopPropagation()

      if (singleton.selectionFocus == null) {
        // First move event, no selection yet.
        // Clear the default selection of the browser
        if (window.getSelection) {
          window.getSelection().empty()
        }
      }

      const selectionType = getSelectionTypeFromTarget(event.target)

      if (
        !isEqual(path, singleton.selectionFocus) ||
        (selectionType !== singleton.selectionAnchorType)
      ) {
        singleton.selectionFocus = path

        onSelect({
          anchorPath: singleton.selectionAnchor,
          focusPath: singleton.selectionFocus
        })
      }
    }
  }

  function handleMouseUp (event) {
    if (singleton.mousedown) {
      event.stopPropagation()

      singleton.mousedown = false
    }

    document.removeEventListener('mouseup', handleMouseUp)
  }

  function handleMouseOver (event) {
    event.stopPropagation()

    if (isChildOfAttribute(event.target, 'data-type', 'selectable-value')) {
      hover = HOVER_COLLECTION
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-inside')) {
      hover = HOVER_INSERT_INSIDE
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-after')) {
      hover = HOVER_INSERT_AFTER
    }
  }

  function handleMouseOut (event) {
    event.stopPropagation()

    hover = null
  }

  function handleInsertInside () {
    onSelect({ type: SELECTION_TYPE.INSIDE, path })
  }

  function handleInsertAfter () {
    onSelect({ type: SELECTION_TYPE.AFTER, path })
  }

  function handleInsertInsideOpenContextMenu (event) {
    handleInsertInside()
    onContextMenu(event)
  }

  function handleInsertAfterOpenContextMenu (event) {
    handleInsertAfter()
    onContextMenu(event)
  }

  $: indentationStyle = getIndentationStyle(path.length)
</script>

<div
  class={classnames('json-node', { expanded }, onClassName(path, value))}
  data-path={compileJSONPointer(path)}
  class:root={root}
  class:selected={selected}
  class:selected-key={selectedKey}
  class:selected-value={selectedValue}
  class:hovered={hover === HOVER_COLLECTION}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseover={handleMouseOver}
  on:mouseout={handleMouseOut}
>
  {#if type === 'array'}
    <div class='header-outer' style={indentationStyle} >
      <div class='header'>
        <button
          type="button"
          class='expand'
          on:click={toggleExpand}
          title='Expand or collapse this array (Ctrl+Click to expand/collapse recursively)'
        >
          {#if expanded}
            <Icon data={faCaretDown} />
          {:else}
            <Icon data={faCaretRight} />
          {/if}
        </button>
        <slot name="identifier" />
        {#if !root}
          <div class="separator">:</div>
        {/if}
        <div class="meta">
          <div class="meta-inner" data-type="selectable-value">
            {#if expanded}
              <div class="bracket expanded">
                [
              </div>
            {:else}
              <div class="bracket">[</div>
              <button type="button" class="tag" on:click={handleExpand}>
                {value.length} items
              </button>
              <div class="bracket">]</div>
            {/if}
          </div>
        </div>
        {#if selection && (selection.type === SELECTION_TYPE.VALUE || selection.type === SELECTION_TYPE.MULTI) && !selection.edit && isEqual(selection.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError validationError={validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          class="insert-selection-area inside"
          data-type="insert-selection-area-inside"
          on:mousedown={handleInsertInside}
        ></div>
      {:else}
        <div
          class="insert-selection-area after"
          data-type="insert-selection-area-after"
          on:mousedown={handleInsertAfter}
        ></div>
      {/if}
    </div>
    {#if expanded}
      <div class="items">
        <div
          class="insert-area inside"
          class:hovered={hover === HOVER_INSERT_INSIDE}
          class:selected={selectedInside}
          data-type="insert-selection-area-inside"
          style={getIndentationStyle(path.length + 1)}
          title={INSERT_EXPLANATION}
        >
          <ContextMenuButton selected={selectedInside} onContextMenu={handleInsertInsideOpenContextMenu} />
        </div>
        {#each visibleSections as visibleSection, sectionIndex (sectionIndex)}
          {#each value.slice(visibleSection.start, Math.min(visibleSection.end, value.length)) as item, itemIndex (state[visibleSection.start + itemIndex][STATE_ID])}
            <svelte:self
              value={item}
              path={path.concat(visibleSection.start + itemIndex)}
              state={state[visibleSection.start + itemIndex]}
              readOnly={readOnly}
              searchResult={searchResult ? searchResult[visibleSection.start + itemIndex] : undefined}
              validationErrors={validationErrors ? validationErrors[visibleSection.start + itemIndex] : undefined}
              onPatch={onPatch}
              onInsert={onInsert}
              onExpand={onExpand}
              onSelect={onSelect}
              onPasteJson={onPasteJson}
              onExpandSection={onExpandSection}
              onContextMenu={onContextMenu}
              onClassName={onClassName}
              selection={selection}
            >
              <div slot="identifier" class="identifier">
                <div class="index">{visibleSection.start + itemIndex}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < value.length}
            <CollapsedItems
              visibleSections={visibleSections}
              sectionIndex={sectionIndex}
              total={value.length}
              path={path}
              onExpandSection={onExpandSection}
            />
          {/if}
        {/each}
      </div>
      <div class="footer-outer" style={indentationStyle} >
        <div data-type="selectable-value" class="footer">
          <span class="bracket">]</span>
        </div>
        {#if !root}
          <div
            class="insert-selection-area after"
            data-type="insert-selection-area-after"
            on:mousedown={handleInsertAfter}
          ></div>
        {/if}
      </div>
    {/if}
  {:else if type === 'object'}
    <div class='header-outer' style={indentationStyle} >
      <div class="header">
        <button
          type="button"
          class='expand'
          on:click={toggleExpand}
          title='Expand or collapse this object (Ctrl+Click to expand/collapse recursively)'
        >
          {#if expanded}
            <Icon data={faCaretDown} />
          {:else}
            <Icon data={faCaretRight} />
          {/if}
        </button>
        <slot name="identifier" />
        {#if !root}
          <div class="separator">:</div>
        {/if}
        <div class="meta" data-type="selectable-value" >
          <div class="meta-inner">
            {#if expanded}
              <div class="bracket expanded">
                &lbrace;
              </div>
            {:else}
              <div class="bracket"> &lbrace;</div>
              <button type="button" class="tag" on:click={handleExpand}>
                {Object.keys(value).length} props
              </button>
              <div class="bracket">&rbrace;</div>
            {/if}
          </div>
        </div>
        {#if selection && (selection.type === SELECTION_TYPE.VALUE || selection.type === SELECTION_TYPE.MULTI) && !selection.edit && isEqual(selection.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError validationError={validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          class="insert-selection-area inside"
          data-type="insert-selection-area-inside"
          on:mousedown={handleInsertInside}
        ></div>
      {:else}
        {#if !root}
          <div
            class="insert-selection-area after"
            data-type="insert-selection-area-after"
            on:mousedown={handleInsertAfter}
          ></div>
        {/if}
      {/if}
    </div>
    {#if expanded}
      <div class="props">
        <div
          class="insert-area inside"
          class:hovered={hover === HOVER_INSERT_INSIDE}
          class:selected={selectedInside}
          data-type="insert-selection-area-inside"
          style={getIndentationStyle(path.length + 1)}
          title={INSERT_EXPLANATION}
        >
          <ContextMenuButton selected={selectedInside} onContextMenu={handleInsertInsideOpenContextMenu} />
        </div>
        {#each keys as key (state[key][STATE_ID])}
          <svelte:self
            value={value[key]}
            path={path.concat(key)}
            state={state[key]}
            readOnly={readOnly}
            searchResult={searchResult ? searchResult[key] : undefined}
            validationErrors={validationErrors ? validationErrors[key] : undefined}
            onPatch={onPatch}
            onInsert={onInsert}
            onExpand={onExpand}
            onSelect={onSelect}
            onPasteJson={onPasteJson}
            onExpandSection={onExpandSection}
            onContextMenu={onContextMenu}
            onClassName={onClassName}
            selection={selection}
          >
            <div slot="identifier" class="identifier">
              <JSONKey
                path={path.concat(key)}
                key={key}
                readOnly={readOnly}
                onUpdateKey={handleUpdateKey}
                selection={selection}
                onSelect={onSelect}
                searchResult={searchResult ? searchResult[key] : undefined}
              />
              {#if selection && selection.type === SELECTION_TYPE.KEY && !selection.edit && isEqual(selection.focusPath, path.concat(key))}
                <ContextMenuButton selected={true} onContextMenu={onContextMenu} />
              {/if}
            </div
          ></svelte:self>
        {/each}
      </div>
      <div class="footer-outer" style={indentationStyle} >
        <div data-type="selectable-value" class="footer">
          <div class="bracket">&rbrace;</div>
        </div>
        {#if !root}
          <div
            class="insert-selection-area after"
            data-type="insert-selection-area-after"
            on:mousedown={handleInsertAfter}
          ></div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="contents-outer" style={indentationStyle} >
      <div class="contents" >
        <slot name="identifier" />
        {#if !root}
          <div class="separator">:</div>
        {/if}
        <JSONValue
          path={path}
          value={value}
          readOnly={readOnly}
          onPatch={onPatch}
          selection={selection}
          onSelect={onSelect}
          onPasteJson={onPasteJson}
          searchResult={searchResult}
        />
        {#if selection && (selection.type === SELECTION_TYPE.VALUE || selection.type === SELECTION_TYPE.MULTI) && !selection.edit && isEqual(selection.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError}
        <ValidationError validationError={validationError} onExpand={handleExpand} />
      {/if}
      {#if !root}
        <div
          class="insert-selection-area after"
          data-type="insert-selection-area-after"
          on:mousedown={handleInsertAfter}
        ></div>
      {/if}
    </div>
  {/if}
  <div
    class="insert-area after"
    class:hovered={hover === HOVER_INSERT_AFTER}
    class:selected={selectedAfter}
    data-type="insert-selection-area-after"
    style={indentationStyle}
    title={INSERT_EXPLANATION}
  >
    <ContextMenuButton selected={selectedAfter} onContextMenu={handleInsertAfterOpenContextMenu} />
  </div>
</div>

<style src="./JSONNode.scss"></style>
