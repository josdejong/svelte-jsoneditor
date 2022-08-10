import type {
  ContentErrors,
  ContentParseError,
  ContentValidationErrors,
  MenuSpaceItem
} from './types.js'

export function isMenuSpaceItem(item: unknown): item is MenuSpaceItem {
  return item && item['space'] === true && Object.keys(item).length === 1
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
