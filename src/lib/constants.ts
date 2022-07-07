import type { Section } from './types'

export const SCROLL_DURATION = 300 // ms
export const DEBOUNCE_DELAY = 300 // ms
export const TEXT_MODE_ONCHANGE_DELAY = 300 // ms
export const SEARCH_UPDATE_THROTTLE = 300 // ms
export const AUTO_SCROLL_INTERVAL = 50 // ms
export const AUTO_SCROLL_SPEED_SLOW = 200 // pixels per second
export const AUTO_SCROLL_SPEED_NORMAL = 400 // pixels per second
export const AUTO_SCROLL_SPEED_FAST = 1200 // pixels per second
export const MAX_SEARCH_RESULTS = 1000
export const ARRAY_SECTION_SIZE = 100
export const DEFAULT_VISIBLE_SECTIONS: Section[] = [{ start: 0, end: ARRAY_SECTION_SIZE }]
export const MAX_VALIDATABLE_SIZE = 100 * 1024 * 1024 // 1 MB
export const MAX_AUTO_REPAIRABLE_SIZE = 1024 * 1024 // 1 MB
export const MAX_DOCUMENT_SIZE_TEXT_MODE = 10 * 1024 * 1024 // 10 MB
export const MAX_DOCUMENT_SIZE_EXPAND_ALL = 10 * 1024 // 10 KB

export const SIMPLE_MODAL_OPTIONS = {
  closeButton: false,
  classBg: 'jse-modal-bg',
  classWindow: 'jse-modal-window',
  classWindowWrap: 'jse-modal-window-wrap',
  classContent: 'jse-modal-content'
}

export const SORT_MODAL_OPTIONS = {
  ...SIMPLE_MODAL_OPTIONS,
  classWindow: 'jse-modal-window jse-modal-window-sort'
}

export const TRANSFORM_MODAL_OPTIONS = {
  ...SIMPLE_MODAL_OPTIONS,
  classWindow: 'jse-modal-window jse-modal-window-transform'
}

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

// TODO: change UPDATE_SELECTION into an enum
export const UPDATE_SELECTION = {
  NO: 'NO',
  SELF: 'SELF',
  NEXT_INSIDE: 'NEXT_INSIDE'
}
