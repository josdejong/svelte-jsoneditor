<script lang="ts">
  import type {
    Content,
    ContentErrors,
    ContextMenuItem,
    HistoryItem,
    History,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    MenuItem,
    MenuSeparator,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnJSONEditorModal,
    OnRenderContextMenu,
    OnRenderContextMenuInternal,
    OnRenderMenu,
    OnRenderMenuInternal,
    OnRenderValue,
    OnSelect,
    OnSortModal,
    OnTransformModal,
    TransformModalOptions,
    Validator,
    ModeHistoryItem
  } from '$lib/types'
  import { Mode } from '$lib/types.js'
  import TextMode from './textmode/TextMode.svelte'
  import TableMode from './tablemode/TableMode.svelte'
  import TreeMode from './treemode/TreeMode.svelte'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isMenuSpace, isModeHistoryItem } from '$lib/typeguards.js'
  import { cloneDeep } from 'lodash-es'
  import { createHistoryInstance } from '$lib/logic/history'
  import { createDebug } from '$lib/utils/debug'

  export let content: Content
  export let selection: JSONEditorSelection | undefined

  export let readOnly: boolean
  export let indentation: number | string
  export let tabSize: number
  export let externalMode: Mode
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let statusBar: boolean
  export let askToFormat: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let flattenColumns: boolean
  export let parser: JSONParser
  export let parseMemoizeOne: JSONParser['parse']
  export let validator: Validator | undefined
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser
  export let insideModal: boolean

  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onSelect: OnSelect
  export let onRenderValue: OnRenderValue
  export let onClassName: OnClassName
  export let onRenderMenu: OnRenderMenu
  export let onRenderContextMenu: OnRenderContextMenu
  export let onError: OnError
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal
  export let onJSONEditorModal: OnJSONEditorModal

  let refTreeMode: TreeMode | undefined
  let refTableMode: TableMode | undefined
  let refTextMode: TextMode | undefined

  const debug = createDebug('jsoneditor:JSONEditorRoot')

  const historyInstance = createHistoryInstance<HistoryItem>({
    onChange: (updatedHistory) => (history = updatedHistory)
  })

  let history: History<HistoryItem> = historyInstance.get()

  let mode = externalMode

  function applyExternalMode(externalMode: Mode) {
    if (externalMode === mode) {
      return
    }

    const item: ModeHistoryItem = {
      type: 'mode',
      undo: { mode, selection: undefined },
      redo: { mode: externalMode, selection: undefined }
    }

    if (mode === 'text' && refTextMode) {
      // flush pending changes before adding a new history item
      refTextMode.flush()
    }

    debug('add history item', item)
    history.add(item)

    mode = externalMode
  }

  $: applyExternalMode(externalMode)

  function handleUndo(item: HistoryItem | undefined) {
    if (isModeHistoryItem(item)) {
      mode = item.undo.mode // important to prevent a new history item from being created

      // find the selection of the previous history item (if any), and use that as initial selection
      const items = history.items()
      const index = items.findIndex((i) => i === item)
      const prevItem = index !== -1 ? items[index - 1] : undefined
      debug('handleUndo', { index, item, items, prevItem })
      if (prevItem) {
        selection = prevItem.redo.selection
      }

      onChangeMode(mode)
    }
  }

  function handleRedo(item: HistoryItem | undefined) {
    if (isModeHistoryItem(item)) {
      // prevent a new history item from being created
      mode = item.redo.mode

      // find the selection of the next history item (if any), and use that as initial selection
      const items = history.items()
      const index = items.findIndex((i) => i === item)
      const nextItem = index !== -1 ? items[index + 1] : undefined
      debug('handleRedo', { index, item, items, nextItem })
      if (nextItem) {
        selection = nextItem.undo.selection
      }

      onChangeMode(mode)
    }
  }

  let modeMenuItems: MenuItem[]
  $: modeMenuItems = [
    {
      type: 'button',
      text: 'text',
      title: `Switch to text mode (current mode: ${mode})`,
      className: 'jse-group-button jse-first' + (mode === Mode.text ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.text)
    },
    {
      type: 'button',
      text: 'tree',
      title: `Switch to tree mode (current mode: ${mode})`,
      className: 'jse-group-button ' + (mode === Mode.tree ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.tree)
    },
    {
      type: 'button',
      text: 'table',
      title: `Switch to table mode (current mode: ${mode})`,
      className: 'jse-group-button jse-last' + (mode === Mode.table ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.table)
    }
  ]

  const separatorMenuItem: MenuSeparator = {
    type: 'separator'
  }

  let handleRenderMenu: OnRenderMenuInternal
  $: handleRenderMenu = (items: MenuItem[]) => {
    const updatedItems = isMenuSpace(items[0])
      ? modeMenuItems.concat(items) // menu is empty, readOnly mode
      : modeMenuItems.concat(separatorMenuItem, items)

    const updatedItemsOriginal = cloneDeep(updatedItems) // the user may change updatedItems in the callback

    return (
      onRenderMenu(updatedItems, { mode, modal: insideModal, readOnly }) || updatedItemsOriginal
    )
  }

  let handleRenderContextMenu: OnRenderContextMenuInternal
  $: handleRenderContextMenu = (items: ContextMenuItem[]) => {
    const itemsOriginal = cloneDeep(items) // the user may change items in the callback

    return (
      onRenderContextMenu(items, { mode, modal: insideModal, readOnly, selection }) ??
      (readOnly ? false : itemsOriginal)
    )
  }

  export function patch(operations: JSONPatchDocument): JSONPatchResult {
    if (refTreeMode) {
      // Note that tree mode has an optional afterPatch callback.
      // right now we don's support this in the public API.
      return refTreeMode.patch(operations)
    }

    if (refTableMode) {
      // Note that tree mode has an optional afterPatch callback.
      // right now we don's support this in the public API.
      return refTableMode.patch(operations)
    }

    if (refTextMode) {
      return refTextMode.patch(operations)
    }

    throw new Error(`Method patch is not available in mode "${mode}"`)
  }

  export function expand(path: JSONPath, callback?: OnExpand): void {
    if (refTreeMode) {
      return refTreeMode.expand(path, callback)
    } else {
      throw new Error(`Method expand is not available in mode "${mode}"`)
    }
  }

  export function collapse(path: JSONPath, recursive: boolean): void {
    if (refTreeMode) {
      return refTreeMode.collapse(path, recursive)
    } else {
      throw new Error(`Method collapse is not available in mode "${mode}"`)
    }
  }

  /**
   * Open the transform modal
   */
  export function transform(options: TransformModalOptions): void {
    if (refTextMode) {
      refTextMode.openTransformModal(options)
    } else if (refTreeMode) {
      refTreeMode.openTransformModal(options)
    } else if (refTableMode) {
      refTableMode.openTransformModal(options)
    } else {
      throw new Error(`Method transform is not available in mode "${mode}"`)
    }
  }

  /**
   * Validate the contents of the editor using the configured validator.
   * Returns a parse error or a list with validation warnings
   */
  export function validate(): ContentErrors | undefined {
    if (refTextMode) {
      return refTextMode.validate()
    } else if (refTreeMode) {
      return refTreeMode.validate()
    } else if (refTableMode) {
      return refTableMode.validate()
    } else {
      throw new Error(`Method validate is not available in mode "${mode}"`)
    }
  }

  /**
   * In tree mode, invalid JSON is automatically repaired when loaded. When the
   * repair was successful, the repaired contents are rendered but not yet
   * applied to the document itself until the user clicks "Ok" or starts editing
   * the data. Instead of accepting the repair, the user can also click
   * "Repair manually instead". Invoking `.acceptAutoRepair()` will
   * programmatically accept the repair. This will trigger an update,
   * and the method itself also returns the updated contents. In case of text
   * mode or when the editor is not in an "accept auto repair" status, nothing
   * will happen, and the contents will be returned as is.
   */
  export function acceptAutoRepair(): Content {
    if (refTreeMode) {
      return refTreeMode.acceptAutoRepair()
    } else {
      return content
    }
  }

  export function scrollTo(path: JSONPath): Promise<void> {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    } else if (refTableMode) {
      return refTableMode.scrollTo(path)
    } else {
      // TODO: implement scrollTo for text mode
      throw new Error(`Method scrollTo is not available in mode "${mode}"`)
    }
  }

  export function findElement(path: JSONPath): Element | undefined {
    if (refTreeMode) {
      return refTreeMode.findElement(path)
    } else if (refTableMode) {
      return refTableMode.findElement(path)
    } else {
      throw new Error(`Method findElement is not available in mode "${mode}"`)
    }
  }

  export function focus() {
    if (refTextMode) {
      refTextMode.focus()
    } else if (refTreeMode) {
      refTreeMode.focus()
    } else if (refTableMode) {
      refTableMode.focus()
    }
  }

  export async function refresh(): Promise<void> {
    if (refTextMode) {
      await refTextMode.refresh()
    } else {
      // nothing to do in tree or table mode (also: don't throw an exception or so,
      // that annoying having to reckon with that when using .refresh()).
    }
  }
</script>

{#if mode === Mode.text || String(mode) === 'code'}
  <TextMode
    bind:this={refTextMode}
    externalContent={content}
    externalSelection={selection}
    {history}
    {readOnly}
    {indentation}
    {tabSize}
    {mainMenuBar}
    {statusBar}
    {askToFormat}
    {escapeUnicodeCharacters}
    {parser}
    {validator}
    {validationParser}
    {onChange}
    {onChangeMode}
    {onSelect}
    onUndo={handleUndo}
    onRedo={handleRedo}
    {onError}
    {onFocus}
    {onBlur}
    onRenderMenu={handleRenderMenu}
    {onSortModal}
    {onTransformModal}
  />
{:else if mode === Mode.table}
  <TableMode
    bind:this={refTableMode}
    externalContent={content}
    externalSelection={selection}
    {history}
    {readOnly}
    {mainMenuBar}
    {escapeControlCharacters}
    {escapeUnicodeCharacters}
    {flattenColumns}
    {parser}
    {parseMemoizeOne}
    {validator}
    {validationParser}
    {indentation}
    {onChange}
    {onChangeMode}
    {onSelect}
    onUndo={handleUndo}
    onRedo={handleRedo}
    {onRenderValue}
    {onFocus}
    {onBlur}
    onRenderMenu={handleRenderMenu}
    onRenderContextMenu={handleRenderContextMenu}
    {onSortModal}
    {onTransformModal}
    {onJSONEditorModal}
  />
{:else}
  <!-- mode === Mode.tree -->
  <TreeMode
    bind:this={refTreeMode}
    externalContent={content}
    externalSelection={selection}
    {history}
    {readOnly}
    {indentation}
    {mainMenuBar}
    {navigationBar}
    {escapeControlCharacters}
    {escapeUnicodeCharacters}
    {parser}
    {parseMemoizeOne}
    {validator}
    {validationParser}
    {pathParser}
    {onError}
    {onChange}
    {onChangeMode}
    {onSelect}
    onUndo={handleUndo}
    onRedo={handleRedo}
    {onRenderValue}
    {onClassName}
    {onFocus}
    {onBlur}
    onRenderMenu={handleRenderMenu}
    onRenderContextMenu={handleRenderContextMenu}
    {onSortModal}
    {onTransformModal}
    {onJSONEditorModal}
  />
{/if}
