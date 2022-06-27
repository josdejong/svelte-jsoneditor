<svelte:options immutable={true} />

<script lang="ts">
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import classnames from 'classnames'
  import { compileJSONPointer, parseJSONPointer } from 'immutable-json-patch'
  import { initial, isEqual, last } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    DEFAULT_VISIBLE_SECTIONS,
    HOVER_COLLECTION,
    HOVER_INSERT_AFTER,
    HOVER_INSERT_INSIDE,
    INSERT_EXPLANATION
  } from '$lib/constants'
  import { getVisibleCaretPositions } from '$lib/logic/documentState'
  import { rename } from '$lib/logic/operations'
  import {
    createAfterSelection,
    createInsideSelection,
    createMultiSelection,
    fromCaretPosition,
    fromSelectionType,
    getEndPath,
    isInsideSelection,
    isKeySelection,
    isPathInsideSelection,
    isValueSelection
  } from '$lib/logic/selection'
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
  import type {
    ExtendedSearchResultItem,
    JSONArray,
    JSONData,
    JSONObject,
    JSONPointer,
    JSONPointerMap,
    Path,
    Selection,
    TreeModeContext,
    VisibleSection
  } from '$lib/types'
  import { SelectionType } from '$lib/types'
  import { beforeUpdate } from 'svelte'
  import {
    getStartPath,
    isAfterSelection,
    isMultiSelection,
    selectionIfOverlapping
  } from '../../../logic/selection'
  import { appendToPointer, filterPointerOrUndefined } from '../../../utils/jsonPointer.js'
  import { filterKeySearchResults, filterValueSearchResults } from '../../../logic/search.js'
  import { createMemoizePath } from '../../../utils/pathUtils'
  import { getEnforceString } from '../../../logic/documentState'

  export let value: JSONData
  export let path: Path
  export let expandedMap: JSONPointerMap<boolean>
  export let enforceStringMap: JSONPointerMap<boolean>
  export let visibleSectionsMap: JSONPointerMap<VisibleSection[]>
  export let validationErrorsMap: JSONPointerMap<ValidationError>
  export let searchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]>
  export let selection: Selection | undefined
  export let context: TreeModeContext
  export let onDragSelectionStart

  const debug = createDebug('jsoneditor:JSONNode')

  let hover = undefined
  let hoverTimer = undefined
  let dragging = undefined

  // important to prevent creating a new path for all children with every re-render,
  // that would force all children to re-render
  const memoizePath = createMemoizePath()

  $: root = path.length === 0
  $: type = valueType(resolvedValue)
  let pointer: JSONPointer
  $: pointer = compileJSONPointer(path)

  let expanded: boolean
  $: expanded = expandedMap ? expandedMap[pointer] === true : false

  let enforceString: boolean | undefined
  $: enforceString = getEnforceString(value, enforceStringMap, pointer)

  let visibleSections: VisibleSection[] | undefined
  $: visibleSections = visibleSectionsMap ? visibleSectionsMap[pointer] : undefined

  let validationError: ValidationError | undefined
  $: validationError = validationErrorsMap ? validationErrorsMap[pointer] : undefined

  $: resolvedValue = dragging?.updatedValue !== undefined ? dragging.updatedValue : value
  let resolvedSelection: Selection | undefined
  $: resolvedSelection =
    dragging?.updatedSelection != undefined ? dragging.updatedSelection : selection

  let isSelected: boolean
  $: isSelected = resolvedSelection ? resolvedSelection.pointersMap[pointer] === true : false

  // FIXME: cleanup logging
  beforeUpdate(() =>
    debug('beforeUpdate', {
      pointer,
      type
    })
  )

  function getIndentationStyle(level) {
    return `margin-left: calc(${level} * var(--jse-indent-size))`
  }

  $: indentationStyle = getIndentationStyle(path.length)

  function getProps(object: JSONObject): { key: string; value: JSONData; pointer: JSONPointer }[] {
    return Object.keys(object).map((key) => ({
      key,
      value: object[key],
      path: memoizePath(path.concat([key])),
      pointer: appendToPointer(pointer, key)
    }))
  }

  function getItems(
    array: JSONArray,
    visibleSection: VisibleSection
  ): { index: number; value: JSONData; pointer: JSONPointer }[] {
    const start = visibleSection.start
    const end = Math.min(visibleSection.end, array.length)
    const items = []

    for (let index = start; index < end; index++) {
      items.push({
        index,
        value: array[index],
        path: memoizePath(path.concat([index])),
        pointer: appendToPointer(pointer, index)
      })
    }

    return items
  }

  function toggleExpand(event) {
    event.stopPropagation()

    const recursive = event.ctrlKey
    context.onExpand(path, !expanded, recursive)
  }

  function handleExpand(event) {
    event.stopPropagation()

    context.onExpand(path, true)
  }

  function handleUpdateKey(oldKey, newKey) {
    const operations = rename(path, Object.keys(value), oldKey, newKey)
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
    const json = context.getJson()
    const documentState = context.getDocumentState()

    // when right-clicking inside the current selection, do nothing: context menu will open
    // when left-clicking inside the current selection, do nothing: it can be the start of dragging
    if (isPathInsideSelection(selection, path, anchorType)) {
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
      if (selection) {
        context.onSelect(createMultiSelection(json, selection.anchorPath, path))
      }
    } else {
      if (anchorType === SelectionType.multi) {
        if (root && event.target.hasAttribute('data-path')) {
          const lastCaretPosition = last(getVisibleCaretPositions(resolvedValue, documentState))
          context.onSelect(fromCaretPosition(lastCaretPosition))
        } else {
          context.onSelect(createMultiSelection(json, path, path))
        }
      } else {
        context.onSelect(fromSelectionType(json, anchorType, path))
      }
    }

    // make sure the editor has focus
    context.focus()
  }

  function handleMouseMove(event) {
    if (singleton.selecting) {
      event.preventDefault()
      event.stopPropagation()

      if (singleton.selectionFocus == null) {
        // First move event, no selection yet.
        // Clear the default selection of the browser
        if (window.getSelection) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.getSelection().empty()
        }
      }

      const selectionType = getSelectionTypeFromTarget(event.target)

      if (
        !isEqual(path, singleton.selectionFocus) ||
        selectionType !== singleton.selectionAnchorType
      ) {
        singleton.selectionFocus = path
        singleton.selectionAnchorType = selectionType // TODO: this is a bit ugly

        const json = context.getJson()
        context.onSelect(
          createMultiSelection(json, singleton.selectionAnchor, singleton.selectionFocus)
        )
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

    const selectionParentPath = initial(selection.focusPath)
    if (!isEqual(path, selectionParentPath)) {
      // pass to parent
      onDragSelectionStart(event)

      return
    }

    // note that the returned items will be of one section only,
    // and when the selection is spread over multiple sections,
    // no items will be returned: this is not (yet) supported
    const items = getVisibleItemsWithHeights(selection)

    debug('dragSelectionStart', { selection, items })

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
        json: context.getJson(),
        documentState: context.getDocumentState(),
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
      const json = context.getJson()
      const documentState = context.getDocumentState()
      const deltaY = calculateDeltaY(dragging, event)
      const { operations, updatedFullSelection } = onMoveSelection({
        json,
        documentState,
        deltaY,
        items: dragging.items
      })

      if (operations) {
        context.onPatch(operations, (patchedJson, patchedState) => ({
          state: {
            ...patchedState,
            selection: updatedFullSelection || selection
          }
        }))
      } else {
        // the user did click inside the selection and no contents have been dragged,
        // select the clicked item
        if (event.target === dragging.initialTarget && !dragging.didMoveItems) {
          const selectionType = getSelectionTypeFromTarget(event.target)
          const path = getDataPathFromTarget(event.target)
          if (path) {
            context.onSelect(fromSelectionType(json, selectionType, path))
          }
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
      const currentSection = DEFAULT_VISIBLE_SECTIONS.find((visibleSection) => {
        return startIndex >= visibleSection.start && endIndex <= visibleSection.end
      })

      if (!currentSection) {
        return null
      }

      const { start, end } = currentSection
      forEachIndex(start, Math.min(value.length, end), addHeight)
    } else {
      // value is Object
      Object.keys(value).forEach(addHeight)
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

      context.onSelect(createInsideSelection(path))
    }
  }

  function handleInsertAfter(event) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      context.onSelect(createAfterSelection(path))
    }
  }

  function handleInsertInsideOpenContextMenu(props) {
    context.onSelect(createInsideSelection(path))
    context.onContextMenu(props)
  }

  function handleInsertAfterOpenContextMenu(props) {
    context.onSelect(createAfterSelection(path))
    context.onContextMenu(props)
  }
</script>

<div
  class={classnames(
    'jse-json-node',
    { 'jse-expanded': expanded },
    context.onClassName(path, resolvedValue)
  )}
  data-path={encodeDataPath(path)}
  class:jse-root={root}
  class:jse-selected={isSelected && isMultiSelection(resolvedSelection)}
  class:jse-selected-key={isSelected && isKeySelection(resolvedSelection)}
  class:jse-selected-value={isSelected && isValueSelection(resolvedSelection)}
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
          {#if expanded}
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
            {#if expanded}
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
        {#if !context.readOnly && isSelected && resolvedSelection && (isValueSelection(resolvedSelection) || isMultiSelection(resolvedSelection)) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
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
    {#if expanded}
      <div class="jse-items">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || (isSelected && isInsideSelection(resolvedSelection)))}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={isSelected && isInsideSelection(resolvedSelection)}
            data-type="insert-selection-area-inside"
            style={getIndentationStyle(path.length + 1)}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuButton
              selected={isSelected && isInsideSelection(resolvedSelection)}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each visibleSections || DEFAULT_VISIBLE_SECTIONS as visibleSection, sectionIndex (sectionIndex)}
          {#each getItems(resolvedValue, visibleSection) as item (item.index)}
            <svelte:self
              value={item.value}
              path={item.path}
              expandedMap={filterPointerOrUndefined(expandedMap, item.pointer)}
              enforceStringMap={filterPointerOrUndefined(enforceStringMap, item.pointer)}
              visibleSectionsMap={filterPointerOrUndefined(visibleSectionsMap, item.pointer)}
              validationErrorsMap={filterPointerOrUndefined(validationErrorsMap, item.pointer)}
              searchResultItemsMap={filterPointerOrUndefined(searchResultItemsMap, item.pointer)}
              selection={selectionIfOverlapping(resolvedSelection, item.pointer)}
              {context}
              onDragSelectionStart={handleDragSelectionStart}
            >
              <div slot="identifier" class="jse-identifier">
                <div class="jse-index">{item.index}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < resolvedValue.length}
            <CollapsedItems
              visibleSections={visibleSections || DEFAULT_VISIBLE_SECTIONS}
              {sectionIndex}
              total={resolvedValue.length}
              {path}
              {pointer}
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
          {#if expanded}
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
            {#if expanded}
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
        {#if !context.readOnly && isSelected && resolvedSelection && (isValueSelection(resolvedSelection) || isMultiSelection(resolvedSelection)) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationError {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
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
    {#if expanded}
      <div class="jse-props">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || (isSelected && isInsideSelection(resolvedSelection)))}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={isSelected && isInsideSelection(resolvedSelection)}
            data-type="insert-selection-area-inside"
            style={getIndentationStyle(path.length + 1)}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuButton
              selected={isSelected && isInsideSelection(resolvedSelection)}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each getProps(resolvedValue) as prop}
          <svelte:self
            value={prop.value}
            path={prop.path}
            expandedMap={filterPointerOrUndefined(expandedMap, prop.pointer)}
            enforceStringMap={filterPointerOrUndefined(enforceStringMap, prop.pointer)}
            visibleSectionsMap={filterPointerOrUndefined(visibleSectionsMap, prop.pointer)}
            validationErrorsMap={filterPointerOrUndefined(validationErrorsMap, prop.pointer)}
            searchResultItemsMap={filterPointerOrUndefined(searchResultItemsMap, prop.pointer)}
            selection={selectionIfOverlapping(resolvedSelection, prop.pointer)}
            {context}
            onDragSelectionStart={handleDragSelectionStart}
          >
            <div slot="identifier" class="jse-identifier">
              <JSONKey
                path={prop.path}
                pointer={prop.pointer}
                key={prop.key}
                selection={selectionIfOverlapping(resolvedSelection, prop.pointer)}
                searchResultItems={filterKeySearchResults(searchResultItemsMap, prop.pointer)}
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
          {enforceString}
          {isSelected}
          selection={isSelected ? resolvedSelection : undefined}
          searchResultItems={filterValueSearchResults(searchResultItemsMap, pointer)}
          {context}
        />
        {#if !context.readOnly && isSelected && resolvedSelection && (isValueSelection(resolvedSelection) || isMultiSelection(resolvedSelection)) && !resolvedSelection.edit && isEqual(resolvedSelection.focusPath, path)}
          <div class="jse-context-menu-button-anchor">
            <ContextMenuButton selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError}
        <ValidationError {validationError} onExpand={handleExpand} />
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
  {#if !context.readOnly && (hover === HOVER_INSERT_AFTER || (isSelected && isAfterSelection(resolvedSelection)))}
    <div
      class="jse-insert-area jse-after"
      class:jse-hovered={hover === HOVER_INSERT_AFTER}
      class:jse-selected={isSelected && isAfterSelection(resolvedSelection)}
      data-type="insert-selection-area-after"
      style={indentationStyle}
      title={INSERT_EXPLANATION}
    >
      <ContextMenuButton
        selected={isSelected && isAfterSelection(resolvedSelection)}
        onContextMenu={handleInsertAfterOpenContextMenu}
      />
    </div>
  {/if}
</div>

<style src="./JSONNode.scss"></style>
