
export const MODE = {
  EDIT: 'edit',
  VIEW: 'view'
}

export const STATE_ID = Symbol('id')
export const STATE_EXPANDED = Symbol('expanded')
export const STATE_VISIBLE_SECTIONS = Symbol('visible sections')
export const STATE_KEYS = Symbol('keys')
export const STATE_SEARCH_PROPERTY = Symbol('search:property')
export const STATE_SEARCH_VALUE = Symbol('search:value')
export const SEARCH_RESULT = Symbol('search:result')
export const ACTIVE_SEARCH_RESULT = Symbol('search:active-result')
export const VALIDATION_ERROR = Symbol('validation:error')

export const SCROLL_DURATION = 300 // ms
export const DEBOUNCE_DELAY = 300
export const SEARCH_PROGRESS_THROTTLE = 300 // ms
export const MAX_SEARCH_RESULTS = 1000
export const ARRAY_SECTION_SIZE = 100
export const DEFAULT_VISIBLE_SECTIONS = [{ start: 0, end: ARRAY_SECTION_SIZE }]
export const MAX_PREVIEW_CHARACTERS = 20e3 // characters

export const INDENTATION_WIDTH = 18 // pixels IMPORTANT: keep in sync with sass constant $indentation-width

export const SIMPLE_MODAL_OPTIONS = {
  closeButton: false,
  styleBg: {
    top: 0,
    left: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'normal'
  },
  styleWindow: {
    borderRadius: '2px'
  },
  styleContent: {
    padding: '0px',
    overflow: 'visible' // needed for select box dropdowns which are larger than the modal
  }
}

export const INSERT_EXPLANATION = 'Insert or paste contents, ' +
  'enter [ insert a new array, ' +
  'enter { to insert a new object, ' +
  'or start typing to insert a new value'

export const HOVER_INSERT_INSIDE = 'hover-insert-inside'
export const HOVER_INSERT_AFTER = 'hover-insert-after'
export const HOVER_COLLECTION = 'hover-collection'

export const INSERT_AFTER_EXPLANATION = 'Click to insert contents after this entry'
export const INSERT_INSIDE_EXPLANATION = 'Click to insert contents inside this array or object'
