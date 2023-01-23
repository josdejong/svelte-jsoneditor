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

export function isContentParseError(
  contentErrors: ContentErrors
): contentErrors is ContentParseError {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return typeof contentErrors['parseError'] === 'object' && contentErrors['parseError'] !== null
}

export function isContentValidationErrors(
  contentErrors: ContentErrors
): contentErrors is ContentValidationErrors {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Array.isArray(contentErrors['validationErrors'])
}
