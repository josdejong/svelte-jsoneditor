import type { Section } from './types'
import { SortDirection } from './types.js'

export const SCROLL_DURATION = 300 // ms
export const DEBOUNCE_DELAY = 300 // ms
export const TEXT_MODE_ONCHANGE_DELAY = 300 // ms
export const AUTO_SCROLL_INTERVAL = 50 // ms
export const AUTO_SCROLL_SPEED_SLOW = 200 // pixels per second
export const AUTO_SCROLL_SPEED_NORMAL = 400 // pixels per second
export const AUTO_SCROLL_SPEED_FAST = 1200 // pixels per second
export const MAX_SEARCH_RESULTS = 1000
export const ARRAY_SECTION_SIZE = 100
export const MAX_VALIDATION_ERRORS = 100
export const MAX_CHARACTERS_TEXT_PREVIEW = 20000
export const MAX_INLINE_OBJECT_CHARS = 50
export const MAX_HEADER_NAME_CHARACTERS = 50
export const DEFAULT_VISIBLE_SECTIONS: Section[] = [{ start: 0, end: ARRAY_SECTION_SIZE }]
export const MAX_VALIDATABLE_SIZE = 100 * 1024 * 1024 // 1 MB
export const MAX_AUTO_REPAIRABLE_SIZE = 1024 * 1024 // 1 MB
export const MAX_DOCUMENT_SIZE_TEXT_MODE = 10 * 1024 * 1024 // 10 MB
export const MAX_DOCUMENT_SIZE_EXPAND_ALL = 10 * 1024 // 10 KB

export const INSERT_EXPLANATION =
  'Insert or paste contents, ' +
  'enter [ insert a new array, ' +
  'enter { to insert a new object, ' +
  'or start typing to insert a new value'

export const CONTEXT_MENU_EXPLANATION =
  'Open context menu ' +
  '(Click here, ' +
  'right click on the selection, ' +
  'or use the context menu button or Ctrl+Q)'

export const HOVER_INSERT_INSIDE = 'hover-insert-inside'
export const HOVER_INSERT_AFTER = 'hover-insert-after'
export const HOVER_COLLECTION = 'hover-collection'

export const JSON_STATUS_VALID = 'valid'
export const JSON_STATUS_REPAIRABLE = 'repairable'
export const JSON_STATUS_INVALID = 'invalid'

// TODO: can we dynamically calculate the size?
export const CONTEXT_MENU_HEIGHT = (40 + 2) * 8 // px
export const CONTEXT_MENU_WIDTH = 260 // px
export const SEARCH_BOX_HEIGHT = 100 // px for search and replace

export const SORT_DIRECTION_NAMES = {
  [SortDirection.asc]: 'ascending',
  [SortDirection.desc]: 'descending'
}
