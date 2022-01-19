<svelte:options immutable={true} />

<script>
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import classnames from 'classnames'
  import { parseJSONPointer } from 'immutable-json-patch'
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
    STATE_SEARCH_PROPERTY,
    STATE_SEARCH_VALUE,
    STATE_SELECTION,
    STATE_VISIBLE_SECTIONS,
    VALIDATION_ERROR
  } from '$lib/constants'
  import { getVisibleCaretPositions } from '$lib/logic/documentState'
  import { rename } from '$lib/logic/operations'
  import { isPathInsideSelection, SELECTION_TYPE } from '$lib/logic/selection'
  import {
    encodeDataPath,
    getSelectionTypeFromTarget,
    isChildOfAttribute,
    isChildOfNodeName,
    isContentEditableDiv
  } from '$lib/utils/domUtils'
  import { valueType } from '$lib/utils/typeUtils'
  import CollapsedItems from './CollapsedItems.svelte'
  import ContextMenuButton from './contextmenu/ContextMenuButton.svelte'
  import JSONKey from './JSONKey.svelte'
  import JSONValue from './JSONValue.svelte'
  import { singleton } from './singleton.js'
  import ValidationError from './ValidationError.svelte'
  import { STATE_ENFORCE_STRING } from '$lib/constants.js'

  // eslint-disable-next-line no-undef-init
  export let value
  export let path
  export let state
  export let readOnly
  export let searchResult
  export let validationErrors
  export let normalization
  export let onPatch
  export let onInsert
  export let onExpand
  export let onSelect
  export let onPasteJson
  export let onRenderValue
  export let onContextMenu
  export let onClassName
  export let onDrag
  export let onDragEnd

  /** @type {function (path: Path, section: Section)} */
  export let onExpandSection

  export let selection
  export let getFullSelection

  // TODO: it is ugly to have to translate selection into selectionObj, and not accidentally use the wrong one. Is there an other way?
  $: selectionObj = selection && selection[STATE_SELECTION]

  $: selected = !!(selectionObj && selectionObj.pathsMap)
  $: selectedAfter = !!(selectionObj && selectionObj.type === SELECTION_TYPE.AFTER)
  $: selectedInside = !!(selectionObj && selectionObj.type === SELECTION_TYPE.INSIDE)
  $: selectedKey = !!(selectionObj && selectionObj.type === SELECTION_TYPE.KEY)
  $: selectedValue = !!(selectionObj && selectionObj.type === SELECTION_TYPE.VALUE)

  $: expanded = state[STATE_EXPANDED]
  $: visibleSections = state[STATE_VISIBLE_SECTIONS]
  $: keys = state[STATE_KEYS]
  $: validationError = validationErrors && validationErrors[VALIDATION_ERROR]
  $: root = path.length === 0

  let hover = null

  $: type = valueType(value)

  function getIndentationStyle(level) {
    return `margin-left: ${level * INDENTATION_WIDTH}px`
  }

  function toggleExpand(event) {
    event.stopPropagation()

    const recursive = event.ctrlKey
    onExpand(path, !expanded, recursive)
  }

  function handleExpand(event) {
    event.stopPropagation()

    onExpand(path, true)
  }

  function handleUpdateKey(oldKey, newKey) {
    const operations = rename(path, keys, oldKey, newKey)
    onPatch(operations)

    // It is possible that the applied key differs from newKey,
    // to prevent duplicate keys. Here we figure out the actually applied key
    const newKeyUnique = last(parseJSONPointer(operations[0].path))

    return newKeyUnique
  }

  function handleMouseDown(event) {
    // check if the mouse down is not happening in the key or value input fields or on a button
    if (isContentEditableDiv(event.target) || isChildOfNodeName(event.target, 'BUTTON')) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    const anchorType = getSelectionTypeFromTarget(event.target)

    // when right-clicking inside the current selection, do nothing
    if (
      event.button === 2 &&
      selectionObj &&
      isPathInsideSelection(selectionObj, path, anchorType)
    ) {
      return
    }

    // TODO: implement start of a drag event when dragging selection with left mouse button

    singleton.mousedown = true
    singleton.selectionAnchor = path
    singleton.selectionAnchorType = anchorType
    singleton.selectionFocus = path

    if (event.shiftKey) {
      // Shift+Click will select multiple entries
      const fullSelection = getFullSelection()
      if (fullSelection) {
        onSelect({
          type: SELECTION_TYPE.MULTI,
          anchorPath: fullSelection.anchorPath,
          focusPath: path
        })
      }
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

    // we attach the mousemove and mouseup event listeners to the global document,
    // so we will not miss if the mouse events happen outside of the editor
    document.addEventListener('mousemove', onDrag, true)
    document.addEventListener('mouseup', handleMouseUpGlobal)
  }

  function handleMouseMove(event) {
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
        selectionType !== singleton.selectionAnchorType
      ) {
        singleton.selectionFocus = path

        onSelect({
          anchorPath: singleton.selectionAnchor,
          focusPath: singleton.selectionFocus
        })
      }
    }
  }

  function handleMouseUpGlobal(event) {
    if (singleton.mousedown) {
      event.stopPropagation()

      singleton.mousedown = false
    }

    onDragEnd()
    document.removeEventListener('mousemove', onDrag, true)
    document.removeEventListener('mouseup', handleMouseUpGlobal)
  }

  function handleMouseOver(event) {
    event.stopPropagation()

    if (isChildOfAttribute(event.target, 'data-type', 'selectable-value')) {
      hover = HOVER_COLLECTION
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-inside')) {
      hover = HOVER_INSERT_INSIDE
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-after')) {
      hover = HOVER_INSERT_AFTER
    }
  }

  function handleMouseOut(event) {
    event.stopPropagation()

    hover = null
  }

  function handleInsertInside(event) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      onSelect({ type: SELECTION_TYPE.INSIDE, path })
    }
  }

  function handleInsertAfter(event) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      onSelect({ type: SELECTION_TYPE.AFTER, path })
    }
  }

  function handleInsertInsideOpenContextMenu(props) {
    onSelect({ type: SELECTION_TYPE.INSIDE, path })
    onContextMenu(props)
  }

  function handleInsertAfterOpenContextMenu(props) {
    onSelect({ type: SELECTION_TYPE.AFTER, path })
    onContextMenu(props)
  }

  $: indentationStyle = getIndentationStyle(path.length)
</script>

<div
  class={classnames('json-node', { expanded }, onClassName(path, value))}
  data-path={encodeDataPath(path)}
  class:root
  class:selected
  class:selected-key={selectedKey}
  class:selected-value={selectedValue}
  class:hovered={hover === HOVER_COLLECTION}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseover={handleMouseOver}
  on:mouseout={handleMouseOut}
  on:focus={undefined}
  on:blur={undefined}
>
  {#if type === 'array'}
    <div class="header-outer" style={indentationStyle}>
      <div class="header">
        <button
          type="button"
          class="expand"
          on:click={toggleExpand}
          title="Expand or collapse this array (Ctrl+Click to expand/collapse recursively)"
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
              <div class="bracket">[</div>
              <span class="tag readonly">
                {value.length} items
              </span>
            {:else}
              <div class="bracket">[</div>
              <button type="button" class="tag" on:click={handleExpand}>
                {value.length} items
              </button>
              <div class="bracket">]</div>
            {/if}
          </div>
        </div>
        {#if !readOnly && selectionObj && (selectionObj.type === SELECTION_TYPE.VALUE || selectionObj.type === SELECTION_TYPE.MULTI) && !selectionObj.edit && isEqual(selectionObj.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} {onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          class="insert-selection-area inside"
          data-type="insert-selection-area-inside"
          on:mousedown={handleInsertInside}
        />
      {:else}
        <div
          class="insert-selection-area after"
          data-type="insert-selection-area-after"
          on:mousedown={handleInsertAfter}
        />
      {/if}
    </div>
    {#if expanded}
      <div class="items">
        {#if !readOnly}
          <div
            class="insert-area inside"
            class:hovered={hover === HOVER_INSERT_INSIDE}
            class:selected={selectedInside}
            data-type="insert-selection-area-inside"
            style={getIndentationStyle(path.length + 1)}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuButton
              selected={selectedInside}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each visibleSections as visibleSection, sectionIndex (sectionIndex)}
          {#each value.slice(visibleSection.start, Math.min(visibleSection.end, value.length)) as item, itemIndex (state[visibleSection.start + itemIndex][STATE_ID])}
            <svelte:self
              value={item}
              path={path.concat(visibleSection.start + itemIndex)}
              state={state[visibleSection.start + itemIndex]}
              selection={selection ? selection[visibleSection.start + itemIndex] : undefined}
              searchResult={searchResult
                ? searchResult[visibleSection.start + itemIndex]
                : undefined}
              validationErrors={validationErrors
                ? validationErrors[visibleSection.start + itemIndex]
                : undefined}
              {readOnly}
              {normalization}
              {getFullSelection}
              {onPatch}
              {onInsert}
              {onExpand}
              {onSelect}
              {onPasteJson}
              {onExpandSection}
              {onRenderValue}
              {onContextMenu}
              {onClassName}
              {onDrag}
              {onDragEnd}
            >
              <div slot="identifier" class="identifier">
                <div class="index">{visibleSection.start + itemIndex}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < value.length}
            <CollapsedItems
              {visibleSections}
              {sectionIndex}
              total={value.length}
              {path}
              {onExpandSection}
              selection={selectionObj}
            />
          {/if}
        {/each}
      </div>
      <div class="footer-outer" style={indentationStyle}>
        <div data-type="selectable-value" class="footer">
          <span class="bracket">]</span>
        </div>
        {#if !root}
          <div
            class="insert-selection-area after"
            data-type="insert-selection-area-after"
            on:mousedown={handleInsertAfter}
          />
        {/if}
      </div>
    {/if}
  {:else if type === 'object'}
    <div class="header-outer" style={indentationStyle}>
      <div class="header">
        <button
          type="button"
          class="expand"
          on:click={toggleExpand}
          title="Expand or collapse this object (Ctrl+Click to expand/collapse recursively)"
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
        <div class="meta" data-type="selectable-value">
          <div class="meta-inner">
            {#if expanded}
              <div class="bracket expanded">&lbrace;</div>
            {:else}
              <div class="bracket">&lbrace;</div>
              <button type="button" class="tag" on:click={handleExpand}>
                {Object.keys(value).length} props
              </button>
              <div class="bracket">&rbrace;</div>
            {/if}
          </div>
        </div>
        {#if !readOnly && selectionObj && (selectionObj.type === SELECTION_TYPE.VALUE || selectionObj.type === SELECTION_TYPE.MULTI) && !selectionObj.edit && isEqual(selectionObj.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} {onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          class="insert-selection-area inside"
          data-type="insert-selection-area-inside"
          on:mousedown={handleInsertInside}
        />
      {:else if !root}
        <div
          class="insert-selection-area after"
          data-type="insert-selection-area-after"
          on:mousedown={handleInsertAfter}
        />
      {/if}
    </div>
    {#if expanded}
      <div class="props">
        {#if !readOnly}
          <div
            class="insert-area inside"
            class:hovered={hover === HOVER_INSERT_INSIDE}
            class:selected={selectedInside}
            data-type="insert-selection-area-inside"
            style={getIndentationStyle(path.length + 1)}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuButton
              selected={selectedInside}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each keys as key (state[key][STATE_ID])}
          <svelte:self
            value={value[key]}
            path={path.concat(key)}
            state={state[key]}
            selection={selection ? selection[key] : undefined}
            searchResult={searchResult ? searchResult[key] : undefined}
            validationErrors={validationErrors ? validationErrors[key] : undefined}
            {readOnly}
            {normalization}
            {getFullSelection}
            {onPatch}
            {onInsert}
            {onExpand}
            {onSelect}
            {onPasteJson}
            {onExpandSection}
            {onRenderValue}
            {onContextMenu}
            {onClassName}
            {onDrag}
            {onDragEnd}
          >
            <div slot="identifier" class="identifier">
              <JSONKey
                path={path.concat(key)}
                {key}
                {readOnly}
                {normalization}
                selection={selection?.[key]?.[STATE_SELECTION]}
                searchResult={searchResult?.[key]?.[STATE_SEARCH_PROPERTY]}
                onUpdateKey={handleUpdateKey}
                {onSelect}
              />
              {#if !readOnly && selectionObj && selectionObj.type === SELECTION_TYPE.KEY && !selectionObj.edit && isEqual(selectionObj.focusPath, path.concat(key))}
                <ContextMenuButton selected={true} {onContextMenu} />
              {/if}
            </div>
          </svelte:self>
        {/each}
      </div>
      <div class="footer-outer" style={indentationStyle}>
        <div data-type="selectable-value" class="footer">
          <div class="bracket">&rbrace;</div>
        </div>
        {#if !root}
          <div
            class="insert-selection-area after"
            data-type="insert-selection-area-after"
            on:mousedown={handleInsertAfter}
          />
        {/if}
      </div>
    {/if}
  {:else}
    <div class="contents-outer" style={indentationStyle}>
      <div class="contents">
        <slot name="identifier" />
        {#if !root}
          <div class="separator">:</div>
        {/if}
        <JSONValue
          {path}
          {value}
          {readOnly}
          enforceString={state ? state[STATE_ENFORCE_STRING] : false}
          {normalization}
          selection={selectionObj}
          searchResult={searchResult ? searchResult[STATE_SEARCH_VALUE] : undefined}
          {onPatch}
          {onSelect}
          {onPasteJson}
          {onRenderValue}
        />
        {#if !readOnly && selectionObj && (selectionObj.type === SELECTION_TYPE.VALUE || selectionObj.type === SELECTION_TYPE.MULTI) && !selectionObj.edit && isEqual(selectionObj.focusPath, path)}
          <div class="context-menu-button-anchor">
            <ContextMenuButton selected={true} {onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError}
        <ValidationError {validationError} onExpand={handleExpand} />
      {/if}
      {#if !root}
        <div
          class="insert-selection-area after"
          data-type="insert-selection-area-after"
          on:mousedown={handleInsertAfter}
        />
      {/if}
    </div>
  {/if}
  {#if !readOnly}
    <div
      class="insert-area after"
      class:hovered={hover === HOVER_INSERT_AFTER}
      class:selected={selectedAfter}
      data-type="insert-selection-area-after"
      style={indentationStyle}
      title={INSERT_EXPLANATION}
    >
      <ContextMenuButton
        selected={selectedAfter}
        onContextMenu={handleInsertAfterOpenContextMenu}
      />
    </div>
  {/if}
</div>

<style src="./JSONNode.scss"></style>
