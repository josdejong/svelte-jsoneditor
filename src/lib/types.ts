/** JSDoc type definitions */

/**
 * @typedef {{} | [] | string | number | boolean | null} JSON
 */
export type JSON = Record<string, unknown> | [] | string | number | boolean | null

/**
 * @typedef {{ json: JSON } | { text: string}} Content
 */
export type Content = Record<'json', JSON> | Record<'text', string>

/**
 * @typedef {Array<string | number | Symbol>} Path
 */
export type Path = Array<string | number>

/**
 * @typedef {'after' | 'key' | 'value' | 'append'} CaretType
 */
export type CaretType = 'after' | 'key' | 'value' | 'append'

/**
 * @typedef {{
 *   start: number,
 *   end: number
 * }} VisibleSection
 */
export type VisibleSection = Record<'start' | 'end', number>

/**
 * @typedef {{
 *   path: Path,
 *   type: CaretType
 * }} CaretPosition
 */
export interface CaretPosition {
  path: Path
  type: CaretType
}

/**
 * @typedef {{
 *   op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test',
 *   path: string,
 *   from?: string,
 *   value?: *
 * }} JSONPatchOperation
 */
export interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: string
  from?: string
  value?: unknown
}

/**
 * @typedef {{
 *   op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test',
 *   path: Path,
 *   from?: Path,
 *   value?: *
 * }} PreprocessedJSONPatchOperation
 */
export interface PreprocessedJSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: Path
  from?: Path
  value?: unknown
}

/**
 * @typedef {JSONPatchOperation[]} JSONPatchDocument
 */
export type JSONPatchDocument = JSONPatchOperation[]

/**
 * @typedef {{
 *   patch: JSONPatchDocument,
 *   revert: JSONPatchDocument,
 *   error: Error | null
 * }} JSONPatchResult
 */
export interface JSONPatchResult {
  patch: JSONPatchDocument
  revert: JSONPatchDocument
  error: Error | null
}

/**
 * @typedef {{
 *   before?: function (json: JSON, operation: PreprocessedJSONPatchOperation) : { json?: JSON, operation?: PreprocessedJSONPatchOperation } | undefined,
 *   after?: function (json: JSON, operation: PreprocessedJSONPatchOperation, previousJson: JSON) : JSON
 * }} JSONPatchOptions
 */
export interface JSONPatchOptions {
  before?: (
    json: JSON,
    operation: PreprocessedJSONPatchOperation
  ) => { json?: JSON; operation?: PreprocessedJSONPatchOperation } | undefined
  after?: (json: JSON, operation: PreprocessedJSONPatchOperation, previousJson: JSON) => JSON
}

/**
 * @typedef {{
 *   type: 'multi',
 *   paths: Path[],
 *   anchorPath: Path,
 *   focusPath: Path,
 *   pathsMap: Object<string, boolean>
 * }} MultiSelection
 */
export interface MultiSelection {
  type: 'multi'
  paths: Path[]
  anchorPath: Path
  focusPath: Path
  pathsMap: Record<string, string | boolean>
}

/**
 * @typedef {{type: 'after', path: Path, anchorPath: Path, focusPath: Path}} AfterSelection
 */
export interface AfterSelection {
  type: 'after'
  path: Path
  anchorPath: Path
  focusPath: Path
}

/**
 * @typedef {{type: 'inside', path: Path, anchorPath: Path, focusPath: Path}} InsideSelection
 */
export interface InsideSelection {
  type: 'inside'
  path: Path
  anchorPath: Path
  focusPath: Path
}

/**
 * @typedef {{type: 'key', path: Path, anchorPath: Path, focusPath: Path, edit?: boolean}} KeySelection
 */
export interface KeySelection {
  type: 'key'
  path: Path
  anchorPath: Path
  focusPath: Path
  edit?: boolean
}

/**
 * @typedef {{type: 'value', path: Path, anchorPath: Path, focusPath: Path, edit?: boolean}} ValueSelection
 */
export interface ValueSelection {
  type: 'value'
  path: Path
  anchorPath: Path
  focusPath: Path
  edit?: boolean
}

/**
 * @typedef {MultiSelection | AfterSelection | InsideSelection | KeySelection | ValueSelection} Selection
 */
export type Selection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | ValueSelection

/**
 * @typedef {{type: 'after', path: Path}} AfterSelectionSchema
 */
export interface AfterSelectionSchema {
  type: 'after'
  path: Path
}

/**
 * @typedef {{type: 'inside', path: Path}} InsideSelectionSchema
 */
export interface InsideSelectionSchema {
  type: 'inside'
  path: Path
}

/**
 * @typedef {{type: 'key', path: Path, edit?: boolean, next?: boolean}} KeySelectionSchema
 */
export interface KeySelectionSchema {
  type: 'key'
  path: Path
  edit?: boolean
  next?: boolean
}

/**
 * @typedef {{type: 'value', path: Path, edit?: boolean, next?: boolean, nextInside?: boolean}} ValueSelectionSchema
 */
export interface ValueSelectionSchema {
  type: 'value'
  path: Path
  edit?: boolean
  next?: boolean
  nextInside?: boolean
}

/**
 * @typedef {{type: 'multi', anchorPath: Path, focusPath: Path}} MultiSelectionSchema
 */
export interface MultiSelectionSchema {
  type: 'multi'
  anchorPath: Path
  focusPath: Path
}

/**
 * @typedef {MultiSelectionSchema  | AfterSelectionSchema | InsideSelectionSchema | KeySelectionSchema | ValueSelectionSchema} SelectionSchema
 */
export type SelectionSchema =
  | MultiSelectionSchema
  | AfterSelectionSchema
  | InsideSelectionSchema
  | KeySelectionSchema
  | ValueSelectionSchema

/**
 * @typedef {Array.<{key: string, value: *}>} ClipboardValues
 */
export type ClipboardValues = Array<{ key: string; value: unknown }>

/**
 * @typedef {{
 *   prefix: string,
 *   iconName: string,
 *   icon: Array
 * }} FontAwesomeIcon
 */
export interface FontAwesomeIcon {
  prefix: string
  iconName: string
  icon: Array
}

/**
 * @typedef {Object} DropdownButtonItem
 * @property {string} text
 * @property {function} onClick
 * @property {FontAwesomeIcon} [icon]
 * @property {string} [title=undefined]
 */
export interface DropdownButtonItem {
  text: string
  onClick: () => void
  icon: FontAwesomeIcon
  /** @default undefined */
  title?: string
}

/**
 * @typedef {Object} MenuButtonItem
 * @property {function} onClick
 * @property {FontAwesomeIcon} [icon]
 * @property {string} [text=undefined]
 * @property {string} [title=undefined]
 * @property {string} [className=undefined]
 * @property {boolean} [disabled=false]
 */
interface MenuButtonItem {
  onClick: () => void
  icon: FontAwesomeIcon
  /** @default undefined */
  title?: string
  /** @default undefined */
  text?: string
  /** @default undefined */
  className?: string
  /** @default false */
  disabled: boolean
}

/**
 * @typedef {Object} MenuSeparatorItem
 * @property {true} separator
 */
export interface MenuSeparatorItem {
  separator: true
}

/**
 * @typedef {Object} MenuSpaceItem
 * @property {true} space
 */
export interface MenuSpaceItem {
  space: true
}

/**
 * @typedef {MenuButtonItem | MenuSeparatorItem | MenuSpaceItem} MenuItem
 */
export type MenuItem = MenuButtonItem | MenuSeparatorItem | MenuSpaceItem

/**
 * @typedef {{path: Path, message: string, isChildError?: boolean}} ValidationError
 */
export interface ValidationError {
  path: Path
  message: string
  isChildError?: boolean
}

/**
 * @typedef {{start: number, end: number}} Section
 *  Start included, end excluded
 */
/** Start included, end excluded */
export type Section = Record<'start' | 'end', number>
