<script lang="ts">
  import type {
    Content,
    ContentErrors,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    MenuItem,
    MenuSeparatorItem,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnClassName,
    OnError,
    OnFocus,
    OnJSONEditorModal,
    OnRenderMenu,
    OnRenderValue,
    OnSortModal,
    OnTransformModal,
    TransformModalOptions,
    Validator
  } from '$lib/types'
  import { Mode } from '$lib/types'
  import TextMode from '$lib/components/modes/textmode/TextMode.svelte'
  import TableMode from '$lib/components/modes/tablemode/TableMode.svelte'
  import TreeMode from '$lib/components/modes/treemode/TreeMode.svelte'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isMenuSpaceItem } from '$lib/typeguards'

  export let content: Content

  export let readOnly: boolean
  export let indentation: number | string
  export let tabSize: number
  export let mode: Mode
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let statusBar: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let flattenColumns: boolean
  export let parser: JSONParser
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser

  export let onChange: OnChange
  export let onRenderValue: OnRenderValue
  export let onClassName: OnClassName
  export let onRenderMenu: OnRenderMenu
  export let onChangeMode: OnChangeMode
  export let onError: OnError
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal
  export let onJSONEditorModal: OnJSONEditorModal

  let refTreeMode
  let refTableMode
  let refTextMode

  let modeMenuItems: MenuItem[]
  $: modeMenuItems = [
    {
      text: 'text',
      title: `Switch to text mode (current mode: ${mode})`,
      // check for 'code' mode is here for backward compatibility (deprecated since v0.4.0)
      className:
        'jse-group-button jse-first' +
        (mode === Mode.text || mode === 'code' ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.text)
    },
    {
      text: 'tree',
      title: `Switch to tree mode (current mode: ${mode})`,
      className: 'jse-group-button ' + (mode === Mode.tree ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.tree)
    },
    {
      text: 'table',
      title: `Switch to table mode (current mode: ${mode})`,
      className: 'jse-group-button jse-last' + (mode === Mode.table ? ' jse-selected' : ''),
      onClick: () => onChangeMode(Mode.table)
    }
  ]

  const separatorMenuItem: MenuSeparatorItem = {
    separator: true
  }

  $: handleRenderMenu = (mode: 'tree' | 'text' | 'repair', items: MenuItem[]) => {
    const updatedItems = isMenuSpaceItem(items[0])
      ? modeMenuItems.concat(items) // menu is empty, readOnly mode
      : modeMenuItems.concat(separatorMenuItem, items)

    return onRenderMenu(mode, updatedItems) || updatedItems
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
  }

  export function expand(callback?: (path: JSONPath) => boolean): void {
    if (refTreeMode) {
      return refTreeMode.expand(callback)
    } else {
      throw new Error(`Method expand is not available in mode "${mode}"`)
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
  export function validate(): ContentErrors {
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

  export function scrollTo(path: JSONPath): void {
    if (refTreeMode) {
      return refTreeMode.scrollTo(path)
    } else {
      // TODO: implement scrollTo for text mode

      throw new Error(`Method scrollTo is not available in mode "${mode}"`)
    }
  }

  export function findElement(path: JSONPath): Element {
    if (refTreeMode) {
      return refTreeMode.findElement(path)
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

  export function refresh() {
    if (refTextMode) {
      refTextMode.refresh()
    } else {
      // nothing to do in tree or table mode (also: don't throw an exception or so,
      // that annoying having to reckon with that when using .refresh()).
    }
  }
</script>

{#if mode === Mode.text || mode === 'code'}
  <TextMode
    bind:this={refTextMode}
    externalContent={content}
    {readOnly}
    {indentation}
    {tabSize}
    {mainMenuBar}
    {statusBar}
    {escapeUnicodeCharacters}
    {parser}
    {validator}
    {validationParser}
    {onChange}
    {onChangeMode}
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
    {readOnly}
    {mainMenuBar}
    {escapeControlCharacters}
    {escapeUnicodeCharacters}
    {flattenColumns}
    {parser}
    {validator}
    {validationParser}
    {indentation}
    {onChange}
    {onChangeMode}
    {onRenderValue}
    {onFocus}
    {onBlur}
    onRenderMenu={handleRenderMenu}
    {onSortModal}
    {onTransformModal}
    {onJSONEditorModal}
  />
{:else}
  <!-- mode === Mode.tree -->
  <TreeMode
    bind:this={refTreeMode}
    externalContent={content}
    {readOnly}
    {indentation}
    {mainMenuBar}
    {navigationBar}
    {escapeControlCharacters}
    {escapeUnicodeCharacters}
    {parser}
    {validator}
    {validationParser}
    {pathParser}
    {onError}
    {onChange}
    {onChangeMode}
    {onRenderValue}
    {onClassName}
    {onFocus}
    {onBlur}
    onRenderMenu={handleRenderMenu}
    {onSortModal}
    {onTransformModal}
    {onJSONEditorModal}
  />
{/if}
