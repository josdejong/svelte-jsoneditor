<svelte:options immutable={true} />

<script lang="ts">
  import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'
  import type { JSONPath, JSONPointer } from 'immutable-json-patch'
  import { appendToJSONPointer, parseJSONPointer } from 'immutable-json-patch'
  import { initial, isEqual, last, range } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import {
    DEFAULT_VISIBLE_SECTIONS,
    HOVER_COLLECTION,
    HOVER_INSERT_AFTER,
    HOVER_INSERT_INSIDE,
    INSERT_EXPLANATION
  } from '$lib/constants.js'
  import { getEnforceString, getVisibleCaretPositions } from '$lib/logic/documentState.js'
  import { rename } from '$lib/logic/operations.js'
  import {
    createAfterSelection,
    createInsideSelection,
    createMultiSelection,
    fromCaretPosition,
    fromSelectionType,
    getAnchorPath,
    getEndPath,
    getFocusPath,
    getSelectionPaths,
    getStartPath,
    isAfterSelection,
    isEditingSelection,
    isInsideSelection,
    isKeySelection,
    isMultiSelection,
    isValueSelection,
    pathInSelection,
    selectionIfOverlapping
  } from '$lib/logic/selection.js'
  import {
    getDataPathFromTarget,
    getSelectionTypeFromTarget,
    isChildOfAttribute,
    isChildOfNodeName,
    isContentEditableDiv
  } from '$lib/utils/domUtils.js'
  import CollapsedItems from './CollapsedItems.svelte'
  import ContextMenuPointer from '../../../components/controls/contextmenu/ContextMenuPointer.svelte'
  import JSONKey from './JSONKey.svelte'
  import JSONValue from './JSONValue.svelte'
  import { singleton } from './singleton.js'
  import { createDebug } from '$lib/utils/debug.js'
  import { onMoveSelection } from '$lib/logic/dragging.js'
  import { forEachIndex, moveItems } from '$lib/utils/arrayUtils.js'
  import type {
    AbsolutePopupOptions,
    CaretPosition,
    DocumentState,
    DraggingState,
    JSONSelection,
    NestedValidationError,
    SearchResults,
    ValidationErrors,
    RenderedItem,
    TreeModeContext,
    VisibleSection
  } from '$lib/types'
  import { SelectionType } from '$lib/types.js'
  import {
    isArrayRecursiveState,
    isExpandableState,
    isObjectRecursiveState
  } from '$lib/typeguards.js'
  import { filterKeySearchResults, filterValueSearchResults } from '$lib/logic/search.js'
  import ValidationErrorIcon from './ValidationErrorIcon.svelte'
  import { isObject } from '$lib/utils/typeUtils.js'
  import { classnames } from '$lib/utils/cssUtils.js'
  import { isCtrlKeyDown } from 'svelte-jsoneditor/utils/keyBindings'

  // We pass `pointer` instead of `path` because pointer (a string) is immutable.
  // Without it, *all* nodes would re-render on *every* change in JSON or DocumentState,
  // because the path changes every time by re-creating it.
  export let pointer: JSONPointer
  export let value: unknown
  export let state: DocumentState | undefined
  export let validationErrors: ValidationErrors | undefined
  export let searchResults: SearchResults | undefined
  export let selection: JSONSelection | undefined
  export let context: TreeModeContext
  export let onDragSelectionStart: (
    event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
  ) => void

  const debug = createDebug('jsoneditor:JSONNode')

  let hover: string | undefined = undefined
  let hoverTimer: number | undefined = undefined
  let dragging: DraggingState | undefined = undefined

  let path: JSONPath
  $: path = parseJSONPointer(pointer)
  $: dataPath = encodeURIComponent(pointer) // This is the same as encodeDataPath(path) but faster

  let expanded: boolean
  $: expanded = isExpandableState(state) ? state.expanded : false

  let enforceString: boolean
  $: enforceString = getEnforceString(value, state, [])

  let visibleSections: VisibleSection[] | undefined
  $: visibleSections = isArrayRecursiveState(state) ? state.visibleSections : undefined

  let validationError: NestedValidationError | undefined
  $: validationError = validationErrors?.validationError

  let isNodeSelected: boolean
  $: isNodeSelected = pathInSelection(context.getJson(), selection, path)

  $: root = path.length === 0

  /**
   * Get sorted keys, applying dragging order
   */
  function getKeys(object: Record<string, unknown>, dragging: DraggingState | undefined): string[] {
    const keys = Object.keys(object)

    // reorder the keys whilst dragging
    if (dragging && dragging.offset !== 0) {
      return moveItems(
        keys,
        dragging.selectionStartIndex,
        dragging.selectionItemsCount,
        dragging.offset
      )
    }

    return keys
  }

  interface ItemIndex {
    index: number
    gutterIndex: number
  }

  function getItems(
    array: Array<unknown>,
    visibleSection: VisibleSection,
    dragging: DraggingState | undefined
  ): ItemIndex[] {
    const start = visibleSection.start
    const end = Math.min(visibleSection.end, array.length)
    const indices = range(start, end)

    // reorder the items whilst dragging
    if (dragging && dragging.offset !== 0) {
      return moveItems(
        indices,
        dragging.selectionStartIndex,
        dragging.selectionItemsCount,
        dragging.offset
      ).map((index, gutterIndex) => ({ index, gutterIndex }))
    }

    return indices.map((index) => ({ index, gutterIndex: index }))
  }

  function toggleExpand(event: MouseEvent) {
    event.stopPropagation()

    const recursive = isCtrlKeyDown(event)
    context.onExpand(path, !expanded, recursive)
  }

  function handleExpand(event: MouseEvent) {
    event.stopPropagation()

    context.onExpand(path, true)
  }

  function handleUpdateKey(oldKey: string, newKey: string): string {
    const operations = rename(path, Object.keys(value as Record<string, unknown>), oldKey, newKey)
    context.onPatch(operations)

    // It is possible that the applied key differs from newKey,
    // to prevent duplicate keys. Here we figure out the actually applied key
    return last(parseJSONPointer(operations[0].path)) as string
  }

  function handleMouseDown(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    // only handle when the left or right mouse button is pressed, not the middle mouse button (scroll wheel)
    if (event.buttons !== 1 && event.buttons !== 2) {
      return
    }

    // check if the mouse down is not happening in the key or value input fields or on a button
    if (
      isContentEditableDiv(event.target as HTMLElement) ||
      (event.buttons === 1 && isChildOfNodeName(event.target as Element, 'BUTTON')) // left mouse on a button
    ) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    // due to event.stopPropagation here and there, the focus tracker does not receive this mouse event.
    // make sure the editor has focus
    context.focus()

    // we attach the mousemove and mouseup event listeners to the global document,
    // so we will not miss if the mouse events happen outside the editor
    document.addEventListener('mousemove', handleMouseMoveGlobal, true)
    document.addEventListener('mouseup', handleMouseUpGlobal)

    const anchorType = getSelectionTypeFromTarget(event.target as Element)
    const json = context.getJson()
    const documentState = context.getDocumentState()

    if (
      selection &&
      anchorType !== SelectionType.after &&
      anchorType !== SelectionType.inside &&
      (selection.type === anchorType || selection.type === SelectionType.multi) &&
      pathInSelection(json, selection, path)
    ) {
      // when right-clicking inside the current selection, do nothing: context menu will open
      // when left-clicking inside the current selection, do nothing: it can be the start of dragging
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
      const fullSelection = context.getSelection()
      if (fullSelection) {
        context.onSelect(createMultiSelection(getAnchorPath(fullSelection), path))
      }
    } else {
      if (anchorType === SelectionType.multi) {
        if (root && (event.target as Element).hasAttribute('data-path')) {
          const lastCaretPosition = last(
            getVisibleCaretPositions(value, documentState)
          ) as CaretPosition
          context.onSelect(fromCaretPosition(lastCaretPosition))
        } else {
          context.onSelect(createMultiSelection(path, path))
        }
      } else if (json !== undefined) {
        context.onSelect(fromSelectionType(anchorType, path))
      }
    }
  }

  function handleMouseMove(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    if (singleton.selecting) {
      event.preventDefault()
      event.stopPropagation()

      if (singleton.selectionFocus === undefined) {
        // First move event, no selection yet.
        // Clear the default selection of the browser
        if (window.getSelection) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.getSelection().empty()
        }
      }

      const selectionType = getSelectionTypeFromTarget(event.target as Element)

      if (
        !isEqual(path, singleton.selectionFocus) ||
        selectionType !== singleton.selectionAnchorType
      ) {
        singleton.selectionFocus = path
        singleton.selectionAnchorType = selectionType // TODO: this is a bit ugly

        context.onSelect(
          createMultiSelection(
            singleton.selectionAnchor || singleton.selectionFocus,
            singleton.selectionFocus
          )
        )
      }
    }
  }

  function handleMouseMoveGlobal(event: MouseEvent) {
    context.onDrag(event)
  }

  function handleMouseUpGlobal(event: Event) {
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

  function calculateDeltaY(dragging: DraggingState, event: MouseEvent) {
    // calculate the contentOffset, this changes when scrolling
    const contentTop = findContentTop()
    const contentOffset = contentTop - dragging.initialContentTop

    // calculate the vertical mouse movement
    const clientOffset = event.clientY - dragging.initialClientY

    return clientOffset - contentOffset
  }

  function handleDragSelectionStart(
    event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
  ) {
    if (context.readOnly || !selection) {
      return
    }

    const selectionParentPath = initial(getFocusPath(selection))
    if (!isEqual(path, selectionParentPath)) {
      // pass to parent
      onDragSelectionStart(event)

      return
    }

    // note that the returned items will be of one section only,
    // and when the selection is spread over multiple sections,
    // no items will be returned: this is not (yet) supported
    const items = getVisibleItemsWithHeights(selection, visibleSections || DEFAULT_VISIBLE_SECTIONS)

    debug('dragSelectionStart', { selection, items })

    if (!items) {
      debug('Cannot drag the current selection (probably spread over multiple sections)')
      return
    }

    const json = context.getJson()
    if (json === undefined) {
      return
    }
    const initialPath = getStartPath(json, selection)
    const selectionStartIndex = items.findIndex((item) => isEqual(item.path, initialPath))
    const { offset } = onMoveSelection({
      json,
      selection: context.getSelection(),
      deltaY: 0,
      items
    })

    dragging = {
      initialTarget: event.target as Element,
      initialClientY: event.clientY,
      initialContentTop: findContentTop(),
      selectionStartIndex,
      selectionItemsCount: getSelectionPaths(json, selection).length,
      items,
      offset,
      didMoveItems: false // whether items have been moved during dragging or not
    }
    singleton.dragging = true

    document.addEventListener('mousemove', handleDragSelection, true)
    document.addEventListener('mouseup', handleDragSelectionEnd)
  }

  function handleDragSelection(event: MouseEvent) {
    if (dragging) {
      const json = context.getJson()
      if (json === undefined) {
        return
      }

      const deltaY = calculateDeltaY(dragging, event)
      const { offset } = onMoveSelection({
        json,
        selection: context.getSelection(),
        deltaY,
        items: dragging.items
      })

      if (offset !== dragging.offset) {
        debug('drag selection', offset, deltaY)

        dragging = {
          ...dragging,
          offset,
          didMoveItems: true
        }
      }
    }
  }

  function handleDragSelectionEnd(event: MouseEvent) {
    if (dragging) {
      const json = context.getJson()
      if (json === undefined) {
        return
      }
      const deltaY = calculateDeltaY(dragging, event)
      const { operations, updatedSelection } = onMoveSelection({
        json,
        selection: context.getSelection(),
        deltaY,
        items: dragging.items
      })

      if (operations) {
        context.onPatch(operations, (_, patchedState) => ({
          state: patchedState,
          selection: updatedSelection ?? selection
        }))
      } else {
        // the user did click inside the selection and no contents have been dragged,
        // select the clicked item
        if (event.target === dragging.initialTarget && !dragging.didMoveItems) {
          const selectionType = getSelectionTypeFromTarget(event.target as Element)
          const path = getDataPathFromTarget(event.target as Element)
          if (path) {
            context.onSelect(fromSelectionType(selectionType, path))
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
   */
  // TODO: extract and unit test getVisibleItemsWithHeights
  function getVisibleItemsWithHeights(
    selection: JSONSelection,
    visibleSections: VisibleSection[]
  ): RenderedItem[] | undefined {
    const items: RenderedItem[] = []

    function addHeight(prop: string) {
      const itemPath = path.concat(prop)
      const element = context.findElement(itemPath)
      if (element !== undefined) {
        items.push({
          path: itemPath,
          height: element.clientHeight
        })
      }
    }

    if (Array.isArray(value)) {
      const json = context.getJson()
      if (json === undefined) {
        return undefined
      }
      const startPath = getStartPath(json, selection)
      const endPath = getEndPath(json, selection)
      const startIndex = parseInt(last(startPath) as string, 10)
      const endIndex = parseInt(last(endPath) as string, 10)

      // find the section where the selection is
      // if the selection is spread over multiple visible sections,
      // we will not return any items, so dragging will not work there.
      // We do this to keep things simple for now.
      const currentSection = visibleSections.find((visibleSection) => {
        return startIndex >= visibleSection.start && endIndex <= visibleSection.end
      })

      if (!currentSection) {
        return undefined
      }

      const { start, end } = currentSection
      forEachIndex(start, Math.min(value.length, end), (index) => addHeight(String(index)))
    } else {
      // value is Object
      Object.keys(value as Record<string, unknown>).forEach(addHeight)
    }

    return items
  }

  function handleMouseOver(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    if (singleton.selecting || singleton.dragging) {
      return
    }

    event.stopPropagation()

    if (isChildOfAttribute(event.target as Element, 'data-type', 'selectable-value')) {
      hover = HOVER_COLLECTION
    } else if (isChildOfAttribute(event.target as Element, 'data-type', 'selectable-key')) {
      hover = undefined
    } else if (
      isChildOfAttribute(event.target as Element, 'data-type', 'insert-selection-area-inside')
    ) {
      hover = HOVER_INSERT_INSIDE
    } else if (
      isChildOfAttribute(event.target as Element, 'data-type', 'insert-selection-area-after')
    ) {
      hover = HOVER_INSERT_AFTER
    }

    clearTimeout(hoverTimer)
  }

  function handleMouseOut(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    event.stopPropagation()

    // to prevent "flickering" in the hovering state when hovering on the edge
    // of the insert area context menu button: it's visibility toggles when
    // `hover` toggles, which will alternating mouseout and mouseover events
    hoverTimer = window.setTimeout(() => (hover = undefined))
  }

  function handleInsertInside(event: MouseEvent) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      context.onSelect(createInsideSelection(path))
    }
  }

  function handleInsertAfter(event: MouseEvent) {
    if (!event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()

      context.onSelect(createAfterSelection(path))
    }
  }

  function handleInsertInsideOpenContextMenu(contextMenuProps: AbsolutePopupOptions) {
    context.onSelect(createInsideSelection(path))
    context.onContextMenu(contextMenuProps)
  }

  function handleInsertAfterOpenContextMenu(contextMenuProps: AbsolutePopupOptions) {
    context.onSelect(createAfterSelection(path))
    context.onContextMenu(contextMenuProps)
  }
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  role="treeitem"
  tabindex="-1"
  class={classnames(
    'jse-json-node',
    { 'jse-expanded': expanded },
    context.onClassName(path, value)
  )}
  data-path={dataPath}
  aria-selected={isNodeSelected}
  style:--level={path.length}
  class:jse-root={root}
  class:jse-selected={isNodeSelected && isMultiSelection(selection)}
  class:jse-selected-value={isNodeSelected && isValueSelection(selection)}
  class:jse-readonly={context.readOnly}
  class:jse-hovered={hover === HOVER_COLLECTION}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseover={handleMouseOver}
  on:mouseout={handleMouseOut}
>
  {#if Array.isArray(value)}
    <div class="jse-header-outer">
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
                {value.length}
                {value.length === 1 ? 'item' : 'items'}
              </span>
              &nbsp;
            {:else}
              <div class="jse-bracket">[</div>
              <button type="button" class="jse-tag" on:click={handleExpand}>
                {value.length}
                {value.length === 1 ? 'item' : 'items'}
              </button>
              <div class="jse-bracket">]</div>
            {/if}
          </div>
        </div>
        {#if !context.readOnly && isNodeSelected && selection && (isValueSelection(selection) || isMultiSelection(selection)) && !isEditingSelection(selection) && isEqual(getFocusPath(selection), path)}
          <div class="jse-context-menu-pointer-anchor">
            <ContextMenuPointer {root} selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationErrorIcon {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          role="none"
          class="jse-insert-selection-area jse-inside"
          data-type="insert-selection-area-inside"
          on:click={handleInsertInside}
        ></div>
      {:else}
        <div
          role="none"
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        ></div>
      {/if}
    </div>
    {#if expanded}
      <div class="jse-items">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || (isNodeSelected && isInsideSelection(selection)))}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={isNodeSelected && isInsideSelection(selection)}
            data-type="insert-selection-area-inside"
            style:--level={path.length + 1}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuPointer
              insert={true}
              selected={isNodeSelected && isInsideSelection(selection)}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each visibleSections || DEFAULT_VISIBLE_SECTIONS as visibleSection, sectionIndex (sectionIndex)}
          {#each getItems(value, visibleSection, dragging) as item (item.index)}
            {@const nestedValidationErrors = isArrayRecursiveState(validationErrors)
              ? validationErrors.items[item.index]
              : undefined}

            {@const nestedSelection = selectionIfOverlapping(
              context.getJson(),
              selection,
              path.concat(String(item.index))
            )}

            <svelte:self
              value={value[item.index]}
              pointer={appendToJSONPointer(pointer, item.index)}
              state={isArrayRecursiveState(state) ? state.items[item.index] : undefined}
              validationErrors={nestedValidationErrors}
              searchResults={isArrayRecursiveState(searchResults)
                ? searchResults.items[item.index]
                : undefined}
              selection={nestedSelection}
              {context}
              onDragSelectionStart={handleDragSelectionStart}
            >
              <div slot="identifier" class="jse-identifier">
                <div class="jse-index">{item.gutterIndex}</div>
              </div>
            </svelte:self>
          {/each}
          {#if visibleSection.end < value.length}
            <CollapsedItems
              visibleSections={visibleSections || DEFAULT_VISIBLE_SECTIONS}
              {sectionIndex}
              total={value.length}
              {path}
              onExpandSection={context.onExpandSection}
              {selection}
              {context}
            />
          {/if}
        {/each}
      </div>
      <div class="jse-footer-outer">
        <div data-type="selectable-value" class="jse-footer">
          <span class="jse-bracket">]</span>
        </div>
        {#if !root}
          <div
            role="none"
            class="jse-insert-selection-area jse-after"
            data-type="insert-selection-area-after"
            on:click={handleInsertAfter}
          ></div>
        {/if}
      </div>
    {/if}
  {:else if isObject(value)}
    <div class="jse-header-outer">
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
                {Object.keys(value).length}
                {Object.keys(value).length === 1 ? 'prop' : 'props'}
              </button>
              <div class="jse-bracket">&rbrace;</div>
            {/if}
          </div>
        </div>
        {#if !context.readOnly && isNodeSelected && selection && (isValueSelection(selection) || isMultiSelection(selection)) && !isEditingSelection(selection) && isEqual(getFocusPath(selection), path)}
          <div class="jse-context-menu-pointer-anchor">
            <ContextMenuPointer {root} selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError && (!expanded || !validationError.isChildError)}
        <ValidationErrorIcon {validationError} onExpand={handleExpand} />
      {/if}
      {#if expanded}
        <div
          role="none"
          class="jse-insert-selection-area jse-inside"
          data-type="insert-selection-area-inside"
          on:click={handleInsertInside}
        ></div>
      {:else if !root}
        <div
          role="none"
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        ></div>
      {/if}
    </div>
    {#if expanded}
      <div class="jse-props">
        {#if !context.readOnly && (hover === HOVER_INSERT_INSIDE || (isNodeSelected && isInsideSelection(selection)))}
          <div
            class="jse-insert-area jse-inside"
            class:jse-hovered={hover === HOVER_INSERT_INSIDE}
            class:jse-selected={isNodeSelected && isInsideSelection(selection)}
            data-type="insert-selection-area-inside"
            style:--level={path.length + 1}
            title={INSERT_EXPLANATION}
          >
            <ContextMenuPointer
              insert={true}
              selected={isNodeSelected && isInsideSelection(selection)}
              onContextMenu={handleInsertInsideOpenContextMenu}
            />
          </div>
        {/if}
        {#each getKeys(value, dragging) as key}
          {@const propPointer = appendToJSONPointer(pointer, key)}

          {@const nestedSearchResults = isObjectRecursiveState(searchResults)
            ? searchResults.properties[key]
            : undefined}

          {@const nestedValidationErrors = isObjectRecursiveState(validationErrors)
            ? validationErrors.properties[key]
            : undefined}

          {@const nestedPath = path.concat(key)}

          {@const nestedSelection = selectionIfOverlapping(
            context.getJson(),
            selection,
            nestedPath
          )}

          <svelte:self
            value={value[key]}
            pointer={propPointer}
            state={isObjectRecursiveState(state) ? state.properties[key] : undefined}
            validationErrors={nestedValidationErrors}
            searchResults={nestedSearchResults}
            selection={nestedSelection}
            {context}
            onDragSelectionStart={handleDragSelectionStart}
          >
            <div
              slot="identifier"
              class="jse-key-outer"
              class:jse-selected-key={isKeySelection(nestedSelection) &&
                isEqual(nestedSelection.path, nestedPath)}
            >
              <JSONKey
                pointer={propPointer}
                {key}
                selection={nestedSelection}
                searchResultItems={filterKeySearchResults(nestedSearchResults)}
                {context}
                onUpdateKey={handleUpdateKey}
              />
            </div>
          </svelte:self>
        {/each}
      </div>
      <div class="jse-footer-outer">
        <div data-type="selectable-value" class="jse-footer">
          <div class="jse-bracket">&rbrace;</div>
        </div>
        {#if !root}
          <div
            role="none"
            class="jse-insert-selection-area jse-after"
            data-type="insert-selection-area-after"
            on:click={handleInsertAfter}
          ></div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="jse-contents-outer">
      <div class="jse-contents">
        <slot name="identifier" />
        {#if !root}
          <div class="jse-separator">:</div>
        {/if}
        <div class="jse-value-outer">
          <JSONValue
            {path}
            {value}
            {enforceString}
            selection={isNodeSelected ? selection : undefined}
            searchResultItems={filterValueSearchResults(searchResults)}
            {context}
          />
        </div>
        {#if !context.readOnly && isNodeSelected && selection && (isValueSelection(selection) || isMultiSelection(selection)) && !isEditingSelection(selection) && isEqual(getFocusPath(selection), path)}
          <div class="jse-context-menu-pointer-anchor">
            <ContextMenuPointer {root} selected={true} onContextMenu={context.onContextMenu} />
          </div>
        {/if}
      </div>
      {#if validationError}
        <ValidationErrorIcon {validationError} onExpand={handleExpand} />
      {/if}
      {#if !root}
        <div
          role="none"
          class="jse-insert-selection-area jse-after"
          data-type="insert-selection-area-after"
          on:click={handleInsertAfter}
        ></div>
      {/if}
    </div>
  {/if}
  {#if !context.readOnly && (hover === HOVER_INSERT_AFTER || (isNodeSelected && isAfterSelection(selection)))}
    <div
      class="jse-insert-area jse-after"
      class:jse-hovered={hover === HOVER_INSERT_AFTER}
      class:jse-selected={isNodeSelected && isAfterSelection(selection)}
      data-type="insert-selection-area-after"
      title={INSERT_EXPLANATION}
    >
      <ContextMenuPointer
        insert={true}
        selected={isNodeSelected && isAfterSelection(selection)}
        onContextMenu={handleInsertAfterOpenContextMenu}
      />
    </div>
  {/if}
</div>

<style src="./JSONNode.scss"></style>
