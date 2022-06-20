<svelte:options immutable={true} />

<script lang="ts">
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import classnames from 'classnames'
  import { compileJSONPointer, parseJSONPointer } from 'immutable-json-patch'
  import { initial, isEqual, last } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    HOVER_COLLECTION,
    HOVER_INSERT_AFTER,
    HOVER_INSERT_INSIDE,
    INSERT_EXPLANATION
  } from '$lib/constants'
  import { getKeys, getVisibleCaretPositions, getVisibleSections } from '$lib/logic/documentState'
  import { rename } from '$lib/logic/operations'
  import { getEndPath, isPathInsideSelection, SELECTION_TYPE } from '$lib/logic/selection'
  import {
    encodeDataPath,
    getDataPathFromTarget,
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
  import { onMoveSelection } from '$lib/logic/dragging'
  import { forEachIndex } from '$lib/utils/arrayUtils'
  import { createMemoizePath } from '$lib/utils/pathUtils'
  import type {
    DocumentState,
    JSONData,
    JSONObject,
    Path,
    TreeModeContext,
    VisibleSection
  } from '$lib/types'
  import { beforeUpdate, onDestroy } from 'svelte'
  import type { Readable } from 'svelte/store'
  import { derived, get } from 'svelte/store'
  import { getStartPath } from '../../../logic/selection'

  export let value: JSONData
  export let path: Path

  export let context: TreeModeContext

  export let onDragSelectionStart

  const debug = createDebug('jsoneditor:JSONNode')

  let hover = undefined
  let hoverTimer = undefined
  let dragging = undefined

  $: root = path.length === 0
  $: type = valueType(resolvedValue)
  $: pointer = compileJSONPointer(path)

  $: resolvedValue = dragging?.updatedValue !== undefined ? dragging.updatedValue : value
  $: resolvedSelection =
    dragging?.updatedSelection != undefined ? dragging.updatedSelection : selection

  $: selected = !!(resolvedSelection && resolvedSelection.pathsMap)
  $: selectedAfter = !!(resolvedSelection && resolvedSelection.type === SELECTION_TYPE.AFTER)
  $: selectedInside = !!(resolvedSelection && resolvedSelection.type === SELECTION_TYPE.INSIDE)
  $: selectedKey = !!(resolvedSelection && resolvedSelection.type === SELECTION_TYPE.KEY)
  $: selectedValue = !!(resolvedSelection && resolvedSelection.type === SELECTION_TYPE.VALUE)

  let visibleSections: Readable<VisibleSection[]>
  $: visibleSections = derived(context.documentStateStore, (state) =>
    getVisibleSections(state, pointer)
  )
  $: keys = derived(context.documentStateStore, (state) => {
    return getKeys(value as JSONObject, state, pointer)
  })

  let validationError: ValidationError | undefined
  $: validationError = derived(
    context.documentStateStore,
    (state) => state.validationErrorsMap[pointer]
  )

  let selection: Selection | undefined

  let unsubscribe
  $: subscribe(context.documentStateStore)

  // TODO: can we simplify this?
  function subscribe(documentStateStore: Readable<DocumentState> | undefined) {
    if (unsubscribe) {
      unsubscribe()
    }

    if (!documentStateStore) {
      return
    }

    unsubscribe = documentStateStore.subscribe((state) => {
      if (!isEqual(selection, state.selectionMap[pointer])) {
        selection = state.selectionMap[pointer]
      }
    })
  }

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  beforeUpdate(() => debug('beforeUpdate', path)) // FIXME: cleanup

  let expanded: Readable<boolean>
  $: expanded = derived(context.documentStateStore, (state) => !!state.expandedMap[pointer])

  function getIndentationStyle(level) {
    return `margin-left: calc(${level} * var(--jse-indent-size))`
  }

  $: indentationStyle = getIndentationStyle(path.length)

  // important to prevent creating a new path for all children with every re-render,
  // that would force all childs to re-render
  const memoizePath = createMemoizePath()

  function toggleExpand(event) {
    event.stopPropagation()

    const recursive = event.ctrlKey
    context.onExpand(path, !$expanded, recursive)
  }

  function handleExpand(event) {
    event.stopPropagation()

    context.onExpand(path, true)
  }

  function handleUpdateKey(oldKey, newKey) {
    const operations = rename(path, $keys, oldKey, newKey)
    context.onPatch(operations)

    // It is possible that the applied key differs from newKey,
    // to prevent duplicate keys. Here we figure out the actually applied key
    const newKeyUnique = last(parseJSONPointer(operations[0].path))

    return newKeyUnique
  }

  function handleMouseDown(event) {
    // check if the mouse down is not happening in the key or value input fields or on a button
    if (
      isContentEditableDiv(event.target) ||
      (event.which === 1 && isChildOfNodeName(event.target, 'BUTTON')) // left mouse on a button
    ) {
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
    if (isPathInsideSelection(context.getFullSelection(), path, anchorType)) {
      if (event.button === 0) {
        context.focus()
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
      const fullSelection = context.getFullSelection()
      if (fullSelection) {
        context.onSelect({
          type: SELECTION_TYPE.MULTI,
          anchorPath: fullSelection.anchorPath,
          focusPath: path
        })
      }
    } else {
      switch (anchorType) {
        // intentional fall-through
        case SELECTION_TYPE.KEY:
        case SELECTION_TYPE.VALUE:
        case SELECTION_TYPE.AFTER:
        case SELECTION_TYPE.INSIDE:
          context.onSelect({ type: anchorType, path })
          break

        case SELECTION_TYPE.MULTI:
          if (root && event.target.hasAttribute('data-path')) {
            const lastCaretPosition = last(
              getVisibleCaretPositions(resolvedValue, get(context.documentStateStore))
            )
            context.onSelect(lastCaretPosition)
          } else {
            context.onSelect({
              type: SELECTION_TYPE.MULTI,
              anchorPath: path,
              focusPath: path
            })
          }
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

        context.onSelect({
          anchorPath: singleton.selectionAnchor,
          focusPath: singleton.selectionFocus
        })
      }
    }
  }

  function handleMouseMoveGlobal(event) {
    context.onDrag(event)
  }

  function handleMouseUpGlobal(event) {
    if (singleton.selecting) {
      singleton.selecting = false

      event.stopPropagation()
    }

    context.onDragEnd()

    document.removeEventListener('mousemove', handleMouseMoveGlobal, true)
    document.removeEventListener('mouseup', handleMouseUpGlobal)
  }

  function findContentTop() {
    return context.findElement([])?.getBoundingClientRect()?.top || 0
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
    if (context.readOnly) {
      return
    }

    const fullSelection = context.getFullSelection()
    const selectionParentPath = initial(fullSelection.focusPath)
    if (!isEqual(path, selectionParentPath)) {
      // pass to parent
      onDragSelectionStart(event)

      return
    }

    // note that the returned items will be of one section only,
    // and when the selection is spread over multiple sections,
    // no items will be returned: this is not (yet) supported
    const items = getVisibleItemsWithHeights(fullSelection)

    debug('dragSelectionStart', { fullSelection, items })

    if (!items) {
      debug('Cannot drag the current selection (probably spread over multiple sections)')
      return
    }

    dragging = {
      initialTarget: event.target,
      initialClientY: event.clientY,
      initialContentTop: findContentTop(),
      updatedValue: undefined,
      updatedState: undefined,
      updatedSelection: undefined,
      items,
      indexOffset: 0,
      didMoveItems: false // whether items have been moved during dragging or not
    }
    singleton.dragging = true

    document.addEventListener('mousemove', handleDragSelection, true)
    document.addEventListener('mouseup', handleDragSelectionEnd)
  }

  function handleDragSelection(event) {
    if (dragging) {
      const deltaY = calculateDeltaY(dragging, event)
      const { updatedValue, updatedState, updatedSelection, indexOffset } = onMoveSelection({
        fullJson: context.getFullJson(),
        fullState: context.getFullState(),
        documentState: get(context.documentStateStore),
        fullSelection: context.getFullSelection(),
        deltaY,
        items: dragging.items
      })

      if (indexOffset !== dragging.indexOffset) {
        debug('drag selection', indexOffset, deltaY, updatedSelection)
        dragging = {
          ...dragging,
          updatedValue,
          updatedState,
          updatedSelection,
          indexOffset,
          didMoveItems: true
        }
      }
    }
  }

  function handleDragSelectionEnd(event) {
    if (dragging) {
      const deltaY = calculateDeltaY(dragging, event)
      const { operations, updatedFullSelection } = onMoveSelection({
        fullJson: context.getFullJson(),
        fullState: context.getFullState(),
        fullSelection: context.getFullSelection(),
        documentState: get(context.documentStateStore),
        deltaY,
        items: dragging.items
      })

      if (operations) {
        context.onPatch(operations, () => ({
          selection: updatedFullSelection || context.getFullSelection()
        }))
      } else {
        // the user did click inside the selection and no contents have been dragged,
        // select the clicked item
        if (event.target === dragging.initialTarget && !dragging.didMoveItems) {
          context.onSelect({
            type: getSelectionTypeFromTarget(event.target),
            path: getDataPathFromTarget(event.target)
          })
        }
      }

      dragging = undefined
      singleton.dragging = false

      document.removeEventListener('mousemove', handleDragSelection, true)
      document.removeEventListener('mouseup', handleDragSelectionEnd)
    }
  }

  /**
   * Get a list with all visible items and their rendered heights inside
   * this object or array
   * @param {Selection} fullSelection
   * @returns {RenderedItem[] | null}
   */
  function getVisibleItemsWithHeights(fullSelection) {
    const items = []

    function addHeight(keyOrIndex) {
      const itemPath = path.concat(keyOrIndex)
      const element = context.findElement(itemPath)
      if (element != null) {
        items.push({
          path: itemPath,
          height: element.clientHeight
        })
      }
    }

    if (Array.isArray(value)) {
      const startPath = getStartPath(fullSelection)
      const endPath = getEndPath(fullSelection)
      const startIndex = last(startPath)
      const endIndex = last(endPath)

      // find the section where the selection is
      // if the selection is spread over multiple visible sections,
      // we will not return any items, so dragging will not work there.
      // We do this to keep things simple for now.
      const currentSection = $visibleSections.find((visibleSection) => {
        return startIndex >= visibleSection.start && endIndex <= visibleSection.end
      })

      if (!currentSection) {
        return null
      }

      const { start, end } = currentSection
      forEachIndex(start, Math.min(value.length, end), addHeight)
    } else {
      // value is Object
      getKeys(value as JSONObject, get(context.documentStateStore), pointer).forEach(addHeight)
    }

    return items
  }

  function handleMouseOver(event) {
    if (singleton.selecting || singleton.dragging) {
      return
    }

    event.stopPropagation()

    if (isChildOfAttribute(event.target, 'data-type', 'selectable-value')) {
      hover = HOVER_COLLECTION
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-inside')) {
      hover = HOVER_INSERT_INSIDE
    } else if (isChildOfAttribute(event.target, 'data-type', 'insert-selection-area-after')) {
      hover = HOVER_INSERT_AFTER
    }

    clearTimeout(hoverTimer)
  }

  function handleMouseOut(event) {
    event.stopPropagation()

    // to prevent "flickering" in the hovering state when hovering on the edge
    // of the insert area context menu button: it's visibility toggles when
    // `hover` toggles, which will alternating mouseout and mouseover events
    hoverTimer = setTimeout(() => (hover = undefined))
  }

  function handleInsertInside(event) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      context.onSelect({ type: SELECTION_TYPE.INSIDE, path })
    }
  }

  function handleInsertAfter(event) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      context.onSelect({ type: SELECTION_TYPE.AFTER, path })
    }
  }

  function handleInsertInsideOpenContextMenu(props) {
    context.onSelect({ type: SELECTION_TYPE.INSIDE, path })
    context.onContextMenu(props)
  }

  function handleInsertAfterOpenContextMenu(props) {
    context.onSelect({ type: SELECTION_TYPE.AFTER, path })
    context.onContextMenu(props)
  }
</script>

<div
  class={classnames(
    'jse-json-node',
    { 'jse-expanded': $expanded },
    context.onClassName(path, resolvedValue)
  )}
  data-path={encodeDataPath(path)}
  class:jse-root={root}
  class:jse-selected={selected}
  class:jse-selected-key={selectedKey}
  class:jse-selected-value={selectedValue}
  class:jse-hovered={hover === HOVER_COLLECTION}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseover={handleMouseOver}
  on:mouseout={handleMouseOut}
  on:focus={undefined}
  on:blur={undefined}
>
  {#if type === 'array'}
    <div class="jse-header-outer" style={indentationStyle}>
      <div class="jse-header">
        <button
          type="button"
          class="jse-expand"
          on:click={toggleExpand}
          title="Expand or collapse this array (Ctrl+Click to expand/collapse recursively)"
        >
          {#if $expanded}
            <Icon data={faCaretDown} />
          {:else}
            <Icon data={faCaretRight} />
          {/if}
        </button>
        <slot name="identifier" />
        {#if !root}
          <div class="jse-separator">:</div>
        {/if}
        <div class="jse-meta">
          <div class="jse-meta-inner" data-type="selectable-value">
            {#if $expanded}
              <div class="jse-bracket">[</div>
              <span class="jse-tag jse-expanded">
                {resolvedValue.length}
                {resolvedValue.length === 1 ? 'item' : 'items'}
              </span>
            {:else}
              <div class="jse-bracket">[</div>
              <button type="button" class="jse-tag" on:click={handleExpand}>
                {resolvedValue.length}
                {resolvedValue.length === 1 ? 'item' : 'items'}
              </button>
              <div class="jse-bracket">]</div>
            {/if}
          </div>
        </div>
        {#if !context.readOnly && resolvedSelection && (resolvedSelection.type === SELECTION_TYPE.VALUE || resolvedSelection.type === SELECTION_TYPE.MULTI) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if $validationError && (!$expanded || !$validationError.isChildError)}
        <ValidationError validationError={$validationError} onExpand={handleExpand} />
      {/if}
      {#if $expanded}
        <div
          class="jse-insert-selection-area jse-inside"
          data-type="insert-selection-area-inside"
          on:click={handleInsertInside}
        />
      {:else}
        <div
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        />
      {/if}
    </div>
    {#if $expanded}
      <div class="jse-items">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || selectedInside)}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={selectedInside}
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
        {#each $visibleSections as visibleSection, sectionIndex (sectionIndex)}
          {#each resolvedValue.slice(visibleSection.start, Math.min(visibleSection.end, resolvedValue.length)) as item, itemIndex (itemIndex)}
            <svelte:self
              value={item}
              path={memoizePath(path.concat(visibleSection.start + itemIndex))}
              {context}
              onDragSelectionStart={handleDragSelectionStart}
            >
              <div slot="identifier" class="jse-identifier">
                <div class="jse-index">{visibleSection.start + itemIndex}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < resolvedValue.length}
            <CollapsedItems
              visibleSections={$visibleSections}
              {sectionIndex}
              total={resolvedValue.length}
              {path}
              onExpandSection={context.onExpandSection}
              selection={resolvedSelection}
            />
          {/if}
        {/each}
      </div>
      <div class="jse-footer-outer" style={indentationStyle}>
        <div data-type="selectable-value" class="jse-footer">
          <span class="jse-bracket">]</span>
        </div>
        {#if !root}
          <div
            class="jse-insert-selection-area jse-after"
            data-type="insert-selection-area-after"
            on:click={handleInsertAfter}
          />
        {/if}
      </div>
    {/if}
  {:else if type === 'object'}
    <div class="jse-header-outer" style={indentationStyle}>
      <div class="jse-header">
        <button
          type="button"
          class="jse-expand"
          on:click={toggleExpand}
          title="Expand or collapse this object (Ctrl+Click to expand/collapse recursively)"
        >
          {#if $expanded}
            <Icon data={faCaretDown} />
          {:else}
            <Icon data={faCaretRight} />
          {/if}
        </button>
        <slot name="identifier" />
        {#if !root}
          <div class="jse-separator">:</div>
        {/if}
        <div class="jse-meta" data-type="selectable-value">
          <div class="jse-meta-inner">
            {#if $expanded}
              <div class="jse-bracket jse-expanded">&lbrace;</div>
            {:else}
              <div class="jse-bracket">&lbrace;</div>
              <button type="button" class="jse-tag" on:click={handleExpand}>
                {Object.keys(resolvedValue).length}
                {Object.keys(resolvedValue).length === 1 ? 'prop' : 'props'}
              </button>
              <div class="jse-bracket">&rbrace;</div>
            {/if}
          </div>
        </div>
        {#if !context.readOnly && resolvedSelection && (resolvedSelection.type === SELECTION_TYPE.VALUE || resolvedSelection.type === SELECTION_TYPE.MULTI) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if $validationError && (!$expanded || !$validationError.isChildError)}
        <ValidationError validationError={$validationError} onExpand={handleExpand} />
      {/if}
      {#if $expanded}
        <div
          class="jse-insert-selection-area jse-inside"
          data-type="insert-selection-area-inside"
          on:click={handleInsertInside}
        />
      {:else if !root}
        <div
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        />
      {/if}
    </div>
    {#if $expanded}
      <div class="jse-props">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || selectedInside)}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={selectedInside}
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
        {#each keys as key}
          <svelte:self
            value={resolvedValue[key]}
            path={memoizePath(path.concat(key))}
            {context}
            onDragSelectionStart={handleDragSelectionStart}
          >
            <div slot="identifier" class="jse-identifier">
              <JSONKey
                path={memoizePath(path.concat(key))}
                {key}
                {context}
                onUpdateKey={handleUpdateKey}
              />
            </div>
          </svelte:self>
        {/each}
      </div>
      <div class="jse-footer-outer" style={indentationStyle}>
        <div data-type="selectable-value" class="jse-footer">
          <div class="jse-bracket">&rbrace;</div>
        </div>
        {#if !root}
          <div
            class="jse-insert-selection-area jse-after"
            data-type="insert-selection-area-after"
            on:click={handleInsertAfter}
          />
        {/if}
      </div>
    {/if}
  {:else}
    <div class="jse-contents-outer" style={indentationStyle}>
      <div class="jse-contents">
        <slot name="identifier" />
        {#if !root}
          <div class="jse-separator">:</div>
        {/if}
        <JSONValue
          {path}
          {value}
          enforceString={get(context.documentStateStore).enforceStringMap[pointer]}
          selection={resolvedSelection}
          {context}
        />
        {#if !context.readOnly && resolvedSelection && (resolvedSelection.type === SELECTION_TYPE.VALUE || resolvedSelection.type === SELECTION_TYPE.MULTI) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if $validationError}
        <ValidationError validationError={$validationError} onExpand={handleExpand} />
      {/if}
      {#if !root}
        <div
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        />
      {/if}
    </div>
  {/if}
  {#if !context.readOnly && (hover === HOVER_INSERT_AFTER || selectedAfter)}
    <div
      class="jse-insert-area jse-after"
      class:jse-hovered={hover === HOVER_INSERT_AFTER}
      class:jse-selected={selectedAfter}
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
