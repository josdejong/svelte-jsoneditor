import type {
  ContentParseError,
  ContentValidationErrors,
  ContextMenuColumn,
  ContextMenuRow,
  MenuButton,
  MenuDropDownButton,
  MenuLabel,
  MenuSeparator,
  MenuSpace,
  ValidationError,
  NestedValidationError,
  SvelteActionRenderer,
  SvelteComponentRenderer,
  ObjectDocumentState2,
  ArrayDocumentState2,
  DocumentState2,
  ValueDocumentState2
} from './types.js'
import { isObject } from '$lib/utils/typeUtils.js'

export function isMenuSpace(item: unknown): item is MenuSpace {
  // checking the .space property is for backward compatibility
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? item['type'] === 'space' || item['space'] === true : false
}

export function isMenuSeparator(item: unknown): item is MenuSeparator {
  // checking the .separator property is for backward compatibility
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? item['type'] === 'separator' || item['separator'] === true : false
}

export function isMenuLabel(item: unknown): item is MenuLabel {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? item['type'] === 'label' && typeof item['text'] === 'string' : false
}

export function isMenuButton(item: unknown): item is MenuButton {
  // for backward compatibility, we only check .onClick here and not item['type'] === 'button'
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? typeof item['onClick'] === 'function' : false
}

export function isMenuDropDownButton(item: unknown): item is MenuDropDownButton {
  return item
    ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      item['type'] === 'dropdown-button' &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        isMenuButton(item['main']) &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        Array.isArray(item['items'])
    : false
}

export function isContextMenuRow(item: unknown): item is ContextMenuRow {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? item['type'] === 'row' && Array.isArray(item['items']) : false
}

export function isContextMenuColumn(item: unknown): item is ContextMenuColumn {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return item ? item['type'] === 'column' && Array.isArray(item['items']) : false
}

export function isContentParseError(contentErrors: unknown): contentErrors is ContentParseError {
  return isObject(contentErrors) && isObject(contentErrors['parseError'])
}

export function isContentValidationErrors(
  contentErrors: unknown
): contentErrors is ContentValidationErrors {
  return isObject(contentErrors) && Array.isArray(contentErrors['validationErrors'])
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

export function isObjectDocumentState(
  state: DocumentState2 | undefined
): state is ObjectDocumentState2 {
  return state !== undefined && state.type === 'object'
}

export function isArrayDocumentState(
  state: DocumentState2 | undefined
): state is ArrayDocumentState2 {
  return state !== undefined && state.type === 'array'
}

export function isValueDocumentState(
  state: DocumentState2 | undefined
): state is ValueDocumentState2 {
  return state !== undefined && state.type === 'value'
}

export function isExpandableState(
  state: DocumentState2 | undefined
): state is ObjectDocumentState2 | ArrayDocumentState2 {
  return isObjectDocumentState(state) || isArrayDocumentState(state)
}
