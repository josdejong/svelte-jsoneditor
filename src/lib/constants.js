export const MODE = {
  TREE: 'tree',
  CODE: 'code'
}

export const STATE_ID = Symbol('id')
export const STATE_EXPANDED = Symbol('expanded')
export const STATE_VISIBLE_SECTIONS = Symbol('visible sections')
export const STATE_KEYS = Symbol('keys')
export const STATE_SEARCH_PROPERTY = Symbol('search:property')
export const STATE_SEARCH_VALUE = Symbol('search:value')
export const STATE_ENFORCE_STRING = Symbol('enforce string')
export const STATE_SELECTION = Symbol('selection')
export const VALIDATION_ERROR = Symbol('validation:error')

export const SCROLL_DURATION = 300 // ms
export const DEBOUNCE_DELAY = 300 // ms
export const CODE_MODE_ONCHANGE_DELAY = 300 // ms
export const SEARCH_UPDATE_THROTTLE = 300 // ms
export const AUTO_SCROLL_INTERVAL = 50 // ms
export const AUTO_SCROLL_SPEED_SLOW = 200 // pixels per second
export const AUTO_SCROLL_SPEED_NORMAL = 400 // pixels per second
export const AUTO_SCROLL_SPEED_FAST = 1200 // pixels per second
export const MAX_SEARCH_RESULTS = 1000
export const ARRAY_SECTION_SIZE = 100
export const DEFAULT_VISIBLE_SECTIONS = [{ start: 0, end: ARRAY_SECTION_SIZE }]
export const MAX_PREVIEW_CHARACTERS = 20e3 // characters
export const MAX_VALIDATABLE_SIZE = 100 * 1024 * 1024 // 1 MB
export const MAX_AUTO_REPAIRABLE_SIZE = 1024 * 1024 // 1 MB
export const MAX_DOCUMENT_SIZE_CODE_MODE = 10 * 1024 * 1024 // 10 MB
export const MAX_DOCUMENT_SIZE_EXPAND_ALL = 10 * 1024 // 10 KB

export const INDENTATION_WIDTH = 18 // pixels IMPORTANT: keep in sync with sass constant $indentation-width

export const SIMPLE_MODAL_OPTIONS = {
  closeButton: false,
  styleBg: {
    top: 0,
    left: 0,
    background: 'rgba(0, 0, 0, 0.3)'
  },
  styleWindow: {
    borderRadius: '2px'
  },
  styleContent: {
    flex: 1,
    display: 'flex',
    padding: '0px'
  }
}

export const SORT_MODAL_OPTIONS = {
  ...SIMPLE_MODAL_OPTIONS,
  styleWindow: {
    ...SIMPLE_MODAL_OPTIONS.styleWindow,
    width: '400px'
  }
}

export const TRANSFORM_MODAL_OPTIONS = {
  ...SIMPLE_MODAL_OPTIONS,
  styleWindow: {
    ...SIMPLE_MODAL_OPTIONS.styleWindow,
    width: '1200px',
    height: '80%',
    display: 'flex'
  }
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

export const UPDATE_SELECTION = {
  NO: 'NO',
  SELF: 'SELF',
  NEXT_INSIDE: 'NEXT_INSIDE'
}
