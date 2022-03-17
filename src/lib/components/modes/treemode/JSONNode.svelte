<svelte:options immutable={true} />

<script>
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import classnames from 'classnames'
  import { getIn, parseJSONPointer } from 'immutable-json-patch'
  import { first, isEqual, last } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    HOVER_COLLECTION,
    HOVER_INSERT_AFTER,
    HOVER_INSERT_INSIDE,
    INDENTATION_WIDTH,
    INSERT_EXPLANATION,
    STATE_ENFORCE_STRING,
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
  import { createDebug } from '$lib/utils/debug'
  import { moveInsideParent } from '../../../logic/operations.js'
  import {
    documentStatePatch,
    getNextPathInside,
    getPreviousPathInside
  } from '../../../logic/documentState.js'
  import {
    createRecursiveSelection,
    createSelectionFromOperations
  } from '../../../logic/selection.js'

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
  export let onFind
  export let onPasteJson
  export let onRenderValue
  export let onContextMenu
  export let onClassName
  export let onDrag
  export let onDragEnd
  export let onDragSelectionStart
  export let onDragSelection
  export let onDragSelectionEnd

  const debug = createDebug('jsoneditor:JSONNode')

  /** @type {function (path: Path, section: Section)} */
  export let onExpandSection

  export let selection
  export let getFullJson
  export let getFullState
  export let getFullSelection
  export let findElement

  $: resolvedValue = dragging !== undefined ? dragging.value : value
  $: resolvedState = dragging !== undefined ? dragging.state : state
  $: resolvedSelection = dragging !== undefined ? dragging.selection : selection

  $: selectionObj = resolvedSelection && resolvedSelection[STATE_SELECTION]

  $: selected = !!(selectionObj && selectionObj.pathsMap)
  $: selectedAfter = !!(selectionObj && selectionObj.type === SELECTION_TYPE.AFTER)
  $: selectedInside = !!(selectionObj && selectionObj.type === SELECTION_TYPE.INSIDE)
  $: selectedKey = !!(selectionObj && selectionObj.type === SELECTION_TYPE.KEY)
  $: selectedValue = !!(selectionObj && selectionObj.type === SELECTION_TYPE.VALUE)

  $: expanded = resolvedState[STATE_EXPANDED]
  $: visibleSections = resolvedState[STATE_VISIBLE_SECTIONS]
  $: keys = resolvedState[STATE_KEYS]
  $: validationError = validationErrors && validationErrors[VALIDATION_ERROR]
  $: root = path.length === 0

  let hover = undefined
  let dragging = undefined

  $: type = valueType(resolvedValue)

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

    // we attach the mousemove and mouseup event listeners to the global document,
    // so we will not miss if the mouse events happen outside the editor
    document.addEventListener('mousemove', handleMouseMoveGlobal, true)
    document.addEventListener('mouseup', handleMouseUpGlobal)

    const anchorType = getSelectionTypeFromTarget(event.target)

    // when right-clicking inside the current selection, do nothing: context menu will open
    // when left-clicking inside the current selection, do nothing: it can be the start of dragging
    if (selectionObj && isPathInsideSelection(selectionObj, path, anchorType)) {
      if (event.button === 0) {
        onDragSelectionStart(event)
      }

      return
    }

    // TODO: refactor dragging, there are now two separate mechanisms handling mouse movement: with dragging.* and with singleton.*
    singleton.selecting = true
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
            const lastCaretPosition = last(getVisibleCaretPositions(resolvedValue, resolvedState))
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
  }

  function handleMouseMove(event) {
    if (singleton.selecting) {
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

  function handleMouseMoveGlobal(event) {
    onDragSelection(event)
    onDrag(event)
  }

  function handleMouseUpGlobal(event) {
    if (singleton.selecting) {
      singleton.selecting = false

      event.stopPropagation()
    }

    onDragSelectionEnd(event)
    onDragEnd()

    document.removeEventListener('mousemove', handleMouseMoveGlobal, true)
    document.removeEventListener('mouseup', handleMouseUpGlobal)
  }

  function findContentTop() {
    return findElement([])?.getBoundingClientRect()?.top || 0
  }

  function calculateDeltaY(dragging, event) {
    // calculate the contentOffset, this changes when scrolling
    const contentTop = findContentTop()
    const contentOffset = contentTop - dragging.initialContentTop

    // calculate the vertical mouse movement
    const clientOffset = event.clientY - dragging.initialClientY

    return clientOffset - contentOffset
  }

  function handleDragSelectionStart(event) {
    // debug('drag selection [start]', path) // TODO: cleanup

    dragging = {
      initialClientY: event.clientY,
      initialContentTop: findContentTop(),
      value,
      state,
      selection
    }
  }

  function handleDragSelection(event) {
    if (dragging) {
      // debug('drag selection [move]', path) // TODO: cleanup

      const deltaY = calculateDeltaY(dragging, event)
      const { value, state, selection } = onMoveSelection(deltaY)
      dragging = {
        ...dragging,
        value,
        state,
        selection
      }
    }
  }

  function handleDragSelectionEnd(event) {
    if (dragging) {
      // debug('drag selection [end]', path) // TODO: cleanup

      const deltaY = calculateDeltaY(dragging, event)
      const { operations } = onMoveSelection(deltaY)

      if (operations) {
        onPatch(operations)
      }

      dragging = undefined
    }
  }

  /**
   *
   * @param deltaY
   * @returns {{operations: null | JSONPatchDocument, value: JSONData, state: JSONData }}
   */
  function onMoveSelection(deltaY) {
    // TODO: refactor this function, it's a mess
    const fullJson = getFullJson()
    const fullState = getFullState()
    const fullSelection = getFullSelection()

    debug('move selection', path, { deltaY, fullSelection })

    if (!fullSelection) {
      return { operations: null, value, state, selection }
    }

    function findSwapPath(initialPath, threshold, getNextPath) {
      let nextPath = getNextPath(initialPath)
      let nextElement = nextPath ? findElement(nextPath) : null
      let cumulativeHeight = 0
      let swapPath = undefined

      while (nextElement && threshold > cumulativeHeight + nextElement.clientHeight / 2) {
        cumulativeHeight += nextElement.clientHeight
        swapPath = nextPath

        nextPath = getNextPath(nextPath)
        nextElement = nextPath ? findElement(nextPath) : null
      }

      return swapPath
    }

    /**
     * @returns {DragInsideAction | undefined}
     */
    function findSwapPathUp() {
      const startPath = fullSelection.paths ? first(fullSelection.paths) : fullSelection.focusPath

      const swapPath = findSwapPath(startPath, Math.abs(deltaY), (path) => {
        return getPreviousPathInside(fullJson, fullState, path)
      })

      return swapPath ? { beforePath: swapPath } : undefined
    }

    /**
     * @returns {DragInsideAction | undefined}
     */
    function findSwapPathDown() {
      const endPath = fullSelection.paths ? last(fullSelection.paths) : fullSelection.focusPath

      const swapPath = findSwapPath(endPath, Math.abs(deltaY), (path) => {
        return getNextPathInside(fullJson, fullState, path)
      })

      if (!swapPath) {
        return undefined
      }

      const beforePath = getNextPathInside(fullJson, fullState, swapPath)

      return Array.isArray(value)
        ? { beforePath: swapPath }
        : beforePath
        ? { beforePath }
        : { append: true }
    }

    const dragInsideAction = deltaY < 0 ? findSwapPathUp() : findSwapPathDown()
    if (dragInsideAction) {
      debug('move selection actions', dragInsideAction)

      const operations = moveInsideParent(fullJson, fullState, fullSelection, dragInsideAction)
      const update = documentStatePatch(fullJson, fullState, operations)

      const fullUpdatedSelection = createRecursiveSelection(
        fullJson,
        createSelectionFromOperations(fullJson, operations)
      )

      const updatedSelection = Array.isArray(value) ? getIn(fullUpdatedSelection, path) : selection

      return {
        operations,
        value: getIn(update.json, path),
        state: getIn(update.state, path),
        selection: updatedSelection
      }
    } else {
      return { operations: null, value, state, selection }
    }
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

    hover = undefined
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
  class={classnames('json-node', { expanded }, onClassName(path, resolvedValue))}
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
                {resolvedValue.length} items
              </span>
            {:else}
              <div class="bracket">[</div>
              <button type="button" class="tag" on:click={handleExpand}>
                {resolvedValue.length} items
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
          {#each resolvedValue.slice(visibleSection.start, Math.min(visibleSection.end, resolvedValue.length)) as item, itemIndex (resolvedState[visibleSection.start + itemIndex][STATE_ID])}
            <svelte:self
              value={item}
              path={path.concat(visibleSection.start + itemIndex)}
              state={resolvedState[visibleSection.start + itemIndex]}
              selection={resolvedSelection
                ? resolvedSelection[visibleSection.start + itemIndex]
                : undefined}
              searchResult={searchResult
                ? searchResult[visibleSection.start + itemIndex]
                : undefined}
              validationErrors={validationErrors
                ? validationErrors[visibleSection.start + itemIndex]
                : undefined}
              {readOnly}
              {normalization}
              {getFullJson}
              {getFullState}
              {getFullSelection}
              {findElement}
              {onPatch}
              {onInsert}
              {onExpand}
              {onSelect}
              {onFind}
              {onPasteJson}
              {onExpandSection}
              {onRenderValue}
              {onContextMenu}
              {onClassName}
              {onDrag}
              {onDragEnd}
              onDragSelectionStart={handleDragSelectionStart}
              onDragSelection={handleDragSelection}
              onDragSelectionEnd={handleDragSelectionEnd}
            >
              <div slot="identifier" class="identifier">
                <div class="index">{visibleSection.start + itemIndex}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < resolvedValue.length}
            <CollapsedItems
              {visibleSections}
              {sectionIndex}
              total={resolvedValue.length}
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
                {Object.keys(resolvedValue).length} props
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
        {#each keys as key (resolvedState[key][STATE_ID])}
          <svelte:self
            value={resolvedValue[key]}
            path={path.concat(key)}
            state={resolvedState[key]}
            selection={resolvedSelection ? resolvedSelection[key] : undefined}
            searchResult={searchResult ? searchResult[key] : undefined}
            validationErrors={validationErrors ? validationErrors[key] : undefined}
            {readOnly}
            {normalization}
            {getFullJson}
            {getFullState}
            {getFullSelection}
            {findElement}
            {onPatch}
            {onInsert}
            {onExpand}
            {onSelect}
            {onFind}
            {onPasteJson}
            {onExpandSection}
            {onRenderValue}
            {onContextMenu}
            {onClassName}
            {onDrag}
            {onDragEnd}
            onDragSelectionStart={handleDragSelectionStart}
            onDragSelection={handleDragSelection}
            onDragSelectionEnd={handleDragSelectionEnd}
          >
            <div slot="identifier" class="identifier">
              <JSONKey
                path={path.concat(key)}
                {key}
                {readOnly}
                {normalization}
                selection={resolvedSelection?.[key]?.[STATE_SELECTION]}
                searchResult={searchResult?.[key]?.[STATE_SEARCH_PROPERTY]}
                onUpdateKey={handleUpdateKey}
                {onSelect}
                {onFind}
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
          enforceString={resolvedState ? resolvedState[STATE_ENFORCE_STRING] : undefined}
          {normalization}
          selection={selectionObj}
          searchResult={searchResult ? searchResult[STATE_SEARCH_VALUE] : undefined}
          {onPatch}
          {onSelect}
          {onFind}
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
