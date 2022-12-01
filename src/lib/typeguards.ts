import type {
  ContentErrors,
  ContentParseError,
  ContentValidationErrors,
  ContextMenuColumn,
  ContextMenuRow,
  MenuButton,
  MenuDropDownButton,
  MenuLabel,
  MenuSeparator,
  MenuSpace,
  MenuSpaceItem
} from './types.js'

export function isMenuSpaceItem(item: unknown): item is MenuSpaceItem {
  return isMenuSpace(item)
}

export function isMenuSpace(item: unknown): item is MenuSpace {
  // checking the .space property is for backward compatibility
  return item && (item['type'] === 'space' || item['space'] === true)
}

export function isMenuSeparator(item: unknown): item is MenuSeparator {
  // checking the .separator property is for backward compatibility
  return item && (item['type'] === 'separator' || item['separator'] === true)
}

export function isMenuLabel(item: unknown): item is MenuLabel {
  return item && item['type'] === 'label' && typeof item['text'] === 'string'
}

export function isMenuButton(item: unknown): item is MenuButton {
  // for backward compatibility, we only check .onClick here and not item['type'] === 'button'
  return item && typeof item['onClick'] === 'function'
}

export function isMenuDropDownButton(item: unknown): item is MenuDropDownButton {
  return (
    item &&
    item['type'] === 'dropdown-button' &&
    isMenuButton(item['main']) &&
    Array.isArray(item['items'])
  )
}

export function isContextMenuRow(item: unknown): item is ContextMenuRow {
  return item && item['type'] === 'row' && Array.isArray(item['items'])
}

export function isContextMenuColumn(item: unknown): item is ContextMenuColumn {
  return item && item['type'] === 'column' && Array.isArray(item['items'])
}

export function isContentParseError(
  contentErrors: ContentErrors
): contentErrors is ContentParseError {
  return typeof contentErrors['parseError'] === 'object' && contentErrors['parseError'] !== null
}

export function isContentValidationErrors(
  contentErrors: ContentErrors
): contentErrors is ContentValidationErrors {
  return Array.isArray(contentErrors['validationErrors'])
}
