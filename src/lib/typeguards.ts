import { isObject } from '$lib/utils/typeUtils.js'
import type {
  ArrayRecursiveState,
  ContentParseError,
  ContentValidationErrors,
  ContextMenuColumn,
  ContextMenuRow,
  HistoryItem,
  MenuButton,
  MenuDropDownButton,
  MenuLabel,
  MenuSeparator,
  MenuSpace,
  ModeHistoryItem,
  NestedValidationError,
  ObjectRecursiveState,
  RecursiveState,
  SearchResults,
  SvelteActionRenderer,
  SvelteComponentRenderer,
  TextHistoryItem,
  TreeHistoryItem,
  ValidationError,
  ValueRecursiveState,
  WithSearchResults
} from './types.js'

export function isMenuSpace(item: unknown): item is MenuSpace {
  // checking the .space property is for backward compatibility
  // @ts-expect-error
  return item ? item.type === 'space' || item.space === true : false
}

export function isMenuSeparator(item: unknown): item is MenuSeparator {
  // checking the .separator property is for backward compatibility
  // @ts-expect-error
  return item ? item.type === 'separator' || item.separator === true : false
}

export function isMenuLabel(item: unknown): item is MenuLabel {
  // @ts-expect-error
  return item ? item.type === 'label' && typeof item.text === 'string' : false
}

export function isMenuButton(item: unknown): item is MenuButton {
  // for backward compatibility, we only check .onClick here and not item['type'] === 'button'
  // @ts-expect-error
  return item ? typeof item.onClick === 'function' : false
}

export function isMenuDropDownButton(item: unknown): item is MenuDropDownButton {
  return item
    ? // @ts-ignore
      item.type === 'dropdown-button' &&
        // @ts-expect-error
        isMenuButton(item.main) &&
        // @ts-expect-error
        Array.isArray(item.items)
    : false
}

export function isContextMenuRow(item: unknown): item is ContextMenuRow {
  // @ts-expect-error
  return item ? item.type === 'row' && Array.isArray(item.items) : false
}

export function isContextMenuColumn(item: unknown): item is ContextMenuColumn {
  // @ts-expect-error
  return item ? item.type === 'column' && Array.isArray(item.items) : false
}

export function isContentParseError(contentErrors: unknown): contentErrors is ContentParseError {
  return isObject(contentErrors) && isObject(contentErrors.parseError)
}

export function isContentValidationErrors(
  contentErrors: unknown
): contentErrors is ContentValidationErrors {
  return isObject(contentErrors) && Array.isArray(contentErrors.validationErrors)
}

export function isValidationError(value: unknown): value is ValidationError {
  return (
    isObject(value) &&
    Array.isArray(value.path) &&
    typeof value.message === 'string' &&
    'severity' in value
  )
}

export function isNestedValidationError(value: unknown): value is NestedValidationError {
  return isObject(value) && isValidationError(value) && typeof value.isChildError === 'boolean'
}

export function isSvelteComponentRenderer(value: unknown): value is SvelteComponentRenderer {
  return isObject(value) && 'component' in value && isObject(value.props)
}

export function isSvelteActionRenderer(value: unknown): value is SvelteActionRenderer {
  return isObject(value) && typeof value.action === 'function' && isObject(value.props)
}

export function isObjectRecursiveState(
  state: RecursiveState | undefined
): state is ObjectRecursiveState {
  return state !== undefined && state.type === 'object'
}

export function isArrayRecursiveState(
  state: RecursiveState | undefined
): state is ArrayRecursiveState {
  return state !== undefined && state.type === 'array'
}

export function isValueRecursiveState(
  state: RecursiveState | undefined
): state is ValueRecursiveState {
  return state !== undefined && state.type === 'value'
}

export function isExpandableState(
  state: RecursiveState | undefined
): state is ObjectRecursiveState | ArrayRecursiveState {
  return isObjectRecursiveState(state) || isArrayRecursiveState(state)
}

export function hasSearchResults(state: SearchResults | undefined): state is WithSearchResults {
  return (
    state !== undefined &&
    Array.isArray((state as unknown as Record<string, unknown>).searchResults)
  )
}

export function isTreeHistoryItem(
  historyItem: HistoryItem | undefined
): historyItem is TreeHistoryItem {
  return historyItem ? historyItem.type === 'tree' : false
}

export function isTextHistoryItem(
  historyItem: HistoryItem | undefined
): historyItem is TextHistoryItem {
  return historyItem ? historyItem.type === 'text' : false
}

export function isModeHistoryItem(
  historyItem: HistoryItem | undefined
): historyItem is ModeHistoryItem {
  return historyItem ? historyItem.type === 'mode' : false
}
