import type { JSONPatchDocument, JSONPath, JSONPointer, JSONValue } from 'immutable-json-patch'
import type { SvelteComponentTyped } from 'svelte'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'

export type { JSONValue, JSONPointer, JSONPath, JSONPatchDocument } from 'immutable-json-patch'

export type TextContent = { text: string } | { json: undefined; text: string }

export type JSONContent = { json: JSONValue } | { json: JSONValue; text: undefined }

export type Content = JSONContent | TextContent

export type JSONParser = JSON

export interface JSONPathParser {
  parse: (pathStr) => JSONPath
  stringify: (path: JSONPath) => string
}

export interface VisibleSection {
  start: number
  end: number
}

export enum Mode {
  text = 'text',
  tree = 'tree',
  table = 'table'
}

export enum SelectionType {
  after = 'after',
  inside = 'inside',
  key = 'key',
  value = 'value',
  multi = 'multi'
}

export enum CaretType {
  after = 'after',
  key = 'key',
  value = 'value',
  inside = 'inside'
}

export interface CaretPosition {
  path: JSONPath
  type: CaretType // TODO: refactor this to use SelectionType here, then we can simplify the util functions to turn this into a selection
}

export interface DocumentState {
  expandedMap: JSONPointerMap<boolean>
  enforceStringMap: JSONPointerMap<boolean>
  visibleSectionsMap: JSONPointerMap<VisibleSection[]>
  selection: JSONSelection | undefined
}

export interface JSONPatchResult {
  json: JSONValue
  previousJson: JSONValue
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export type AfterPatchCallback = (
  patchedJson: JSONValue,
  patchedState: DocumentState
) => { json?: JSONValue; state?: DocumentState }

export interface MultiSelection {
  type: SelectionType.multi
  paths: JSONPath[]
  anchorPath: JSONPath
  focusPath: JSONPath
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface AfterSelection {
  type: SelectionType.after
  anchorPath: JSONPath
  focusPath: JSONPath
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface InsideSelection {
  type: SelectionType.inside
  anchorPath: JSONPath
  focusPath: JSONPath
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface KeySelection {
  type: SelectionType.key
  anchorPath: JSONPath
  focusPath: JSONPath
  pointersMap: { [pointer: JSONPointer]: boolean }
  edit?: boolean
}

export interface ValueSelection {
  type: SelectionType.value
  anchorPath: JSONPath
  focusPath: JSONPath
  pointersMap: { [pointer: JSONPointer]: boolean }
  edit?: boolean
}

export type JSONSelection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | ValueSelection

export type JSONPointerMap<T> = { [pointer: JSONPointer]: T }

export type ClipboardValues = Array<{ key: string; value: JSONValue }>

/**
 * @deprecated Use IconDefinition instead of FontAwesomeIcon
 */
export type FontAwesomeIcon = IconDefinition

export interface DropdownButtonItem {
  text: string
  onClick: () => void
  icon?: IconDefinition
  title?: string
  disabled?: boolean
}

export interface MenuButtonItem {
  onClick: () => void
  icon?: IconDefinition
  text?: string
  title?: string
  className?: string
  disabled?: boolean
}

export interface MenuSeparatorItem {
  separator: true
}

export interface MenuSpaceItem {
  space: true
}

export type MenuItem = MenuButtonItem | MenuSeparatorItem | MenuSpaceItem

export interface MessageAction {
  text: string
  title: string
  icon?: IconDefinition
  onClick?: () => void
  onMouseDown?: () => void
  disabled?: boolean
}

export enum ValidationSeverity {
  info = 'info',
  warning = 'warning',
  error = 'error'
}

export interface ValidationError {
  path: JSONPath
  message: string
  severity: ValidationSeverity
}

export interface NestedValidationError extends ValidationError {
  isChildError?: boolean
}

export type Validator = (json: JSONValue) => ValidationError[]

export interface ParseError {
  position: number | null
  line: number | null
  column: number | null
  message: string
}

export interface ContentParseError {
  parseError: ParseError
  isRepairable: boolean
}

export interface ContentValidationErrors {
  validationErrors: ValidationError[]
}

export type ContentErrors = ContentParseError | ContentValidationErrors

export interface RichValidationError extends ValidationError {
  line?: number
  column?: number
  from: number
  to: number
  actions: Array<{ name: string; apply: () => void }> | null
}

export interface TextLocation {
  path: JSONPath
  line: number
  column: number
  from: number
  to: number
}

export interface Section {
  start: number // start included
  end: number // end excluded
}

export interface QueryLanguage {
  id: string
  name: string
  description: string
  createQuery: (json: JSONValue, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: JSONValue, query: string) => JSONValue
}

export interface QueryLanguageOptions {
  filter?: {
    path?: string[]
    relation?: '==' | '!=' | '<' | '<=' | '>' | '>='
    value?: string
  }
  sort?: {
    path?: string[]
    direction?: 'asc' | 'desc'
  }
  projection?: {
    paths?: string[][]
  }
}

export type OnChangeQueryLanguage = (queryLanguageId: string) => void
export interface OnChangeStatus {
  contentErrors: ContentErrors
  patchResult: JSONPatchResult | null
}
export type OnChange = ((content: Content, previousContent: Content, OnChangeStatus) => void) | null
export type OnSelect = (selection: JSONSelection) => void
export type OnPatch = (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => void
export type OnSort = (operations: JSONPatchDocument) => void
export type OnFind = (findAndReplace: boolean) => void
export type OnPaste = (pastedText: string) => void
export type OnPasteJson = (pastedJson: { path: JSONPath; contents: JSONValue }) => void
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: JSONPath, value: JSONValue) => string | undefined
export type OnChangeMode = (mode: Mode) => void
export type OnContextMenu = (contextMenuProps: AbsolutePopupOptions) => void
export type OnRenderMenu = (
  mode: 'tree' | 'text' | 'table' | 'repair',
  items: MenuItem[]
) => MenuItem[] | undefined
export type OnError = (error: Error) => void
export type OnFocus = () => void
export type OnBlur = () => void

export interface SearchResult {
  items: ExtendedSearchResultItem[]
  itemsMap: JSONPointerMap<ExtendedSearchResultItem[]>
  activeItem: ExtendedSearchResultItem | undefined
  activeIndex: number | -1
}

export enum SearchField {
  key = 'key',
  value = 'value'
}

export interface SearchResultItem {
  path: JSONPath
  field: SearchField
  fieldIndex: number
  start: number
  end: number
}

export interface ExtendedSearchResultItem extends SearchResultItem {
  active: boolean
}

export interface ValueNormalization {
  escapeValue: (unescapedValue: unknown) => string
  unescapeValue: (escapedValue: string) => string
}

export type PastedJson = { contents: JSONValue; path: JSONPath } | undefined

export type EscapeValue = (value: JSONValue) => string

export type UnescapeValue = (escapedValue: string) => string

export interface DragInsideProps {
  json: JSONValue
  selection: JSONSelection
  deltaY: number
  items: Array<{ path: JSONPath; height: number }>
}

export type DragInsideAction =
  | { beforePath: JSONPath; offset: number }
  | { append: true; offset: number }

export interface RenderedItem {
  path: JSONPath
  height: number
}

export interface HistoryItem {
  undo: {
    patch: JSONPatchDocument | undefined
    json: JSONValue | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
  redo: {
    patch: JSONPatchDocument | undefined
    json: JSONValue | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
}

export type InsertType = 'value' | 'object' | 'array' | 'structure'

export interface PopupEntry {
  id: number
  component: SvelteComponentTyped
  props: Record<string, unknown>
  options: AbsolutePopupOptions
}

export interface AbsolutePopupOptions {
  anchor?: Element
  left?: number
  top?: number
  width?: number
  height?: number
  offsetTop?: number
  offsetLeft?: number
  showTip?: boolean
  closeOnOuterClick?: boolean
  onClose?: () => void
}

export interface JSONEditorPropsOptional {
  content?: Content
  readOnly?: boolean
  indentation?: number | string
  tabSize?: number
  mode?: Mode
  mainMenuBar?: boolean
  navigationBar?: boolean
  statusBar?: boolean
  escapeControlCharacters?: boolean
  escapeUnicodeCharacters?: boolean
  validator?: Validator

  queryLanguages?: QueryLanguage[]
  queryLanguageId?: string

  onChangeQueryLanguage?: OnChangeQueryLanguage
  onChange?: OnChange
  onRenderValue?: OnRenderValue
  onClassName?: OnClassName
  onRenderMenu?: OnRenderMenu
  onChangeMode?: OnChangeMode
  onError?: OnError
  onFocus?: OnFocus
  onBlur?: OnBlur
}

export interface JSONEditorContext {
  readOnly: boolean
  parser: JSONParser
  normalization: ValueNormalization
  getJson: () => JSONValue
  getDocumentState: () => DocumentState
  findElement: (path: JSONPath) => Element | null
  focus: () => void
  onPatch: (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => JSONPatchResult
  onSelect: OnSelect
  onFind: OnFind
  onPasteJson: (newPastedJson: PastedJson) => void
  onRenderValue: OnRenderValue
}

export interface TreeModeContext extends JSONEditorContext {
  getJson: () => JSONValue
  getDocumentState: () => DocumentState
  findElement: (path: JSONPath) => Element | null
  onInsert: (type: InsertType) => void
  onExpand: (path: JSONPath, expanded: boolean, recursive?: boolean) => void
  onExpandSection: (path: JSONPath, section: Section) => void
  onContextMenu: OnContextMenu
  onClassName: OnClassName
  onDrag: (event: Event) => void
  onDragEnd: () => void
}

export interface RenderValuePropsOptional {
  path?: JSONPath
  value?: JSONValue
  readOnly?: boolean
  enforceString?: boolean
  selection?: JSONSelection
  searchResultItems?: SearchResultItem[]
  isSelected?: boolean
  isEditing?: boolean
  parser?: JSONParser
  normalization?: ValueNormalization
  onPatch?: TreeModeContext['onPatch']
  onPasteJson?: OnPasteJson
  onSelect?: OnSelect
  onFind?: OnFind
  focus?: () => void
}

export interface RenderValueProps extends RenderValuePropsOptional {
  path: JSONPath
  value: JSONValue
  readOnly: boolean
  enforceString: boolean
  selection: JSONSelection | undefined
  searchResultItems: SearchResultItem[] | undefined
  isSelected: boolean
  isEditing: boolean
  parser: JSONParser
  normalization: ValueNormalization
  onPatch: TreeModeContext['onPatch']
  onPasteJson: OnPasteJson
  onSelect: OnSelect
  onFind: OnFind
  focus: () => void
}

export interface JSONNodeProp {
  key: string
  value: JSONValue
  path: JSONPath
  pointer: JSONPointer
  expandedMap: JSONPointerMap<boolean> | undefined
  enforceStringMap: JSONPointerMap<boolean> | undefined
  visibleSectionsMap: JSONPointerMap<VisibleSection[]> | undefined
  validationErrorsMap: JSONPointerMap<NestedValidationError> | undefined
  keySearchResultItemsMap: ExtendedSearchResultItem[] | undefined
  valueSearchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]> | undefined
  selection: JSONSelection | undefined
}

export interface JSONNodeItem {
  index: number
  value: JSONValue
  path: JSONPath
  pointer: JSONPointer
  expandedMap: JSONPointerMap<boolean> | undefined
  enforceStringMap: JSONPointerMap<boolean> | undefined
  visibleSectionsMap: JSONPointerMap<VisibleSection[]> | undefined
  validationErrorsMap: JSONPointerMap<NestedValidationError> | undefined
  searchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]> | undefined
  selection: JSONSelection | undefined
}

export interface DraggingState {
  initialTarget: Element
  initialClientY: number
  initialContentTop: number
  selectionStartIndex: number
  selectionItemsCount: number
  items: RenderedItem[] | null
  offset: number
  didMoveItems: boolean
}

// TODO: can we define proper generic types here?
export interface RenderValueComponentDescription {
  component: SvelteComponentTyped
  props: Record<string, unknown>
}

export interface TransformModalOptions {
  id?: string
  selectedPath?: JSONPath
  onTransform?: (state: {
    operations: JSONPatchDocument
    json: JSONValue
    transformedJson: JSONValue
  }) => void
  onClose?: () => void
}

export interface TransformModalCallback extends TransformModalOptions {
  id: string
  selectedPath: JSONPath
  json: JSONValue
  onTransform: (state: {
    operations: JSONPatchDocument
    json: JSONValue
    transformedJson: JSONValue
  }) => void
  onClose: () => void
}

export interface SortModalCallback {
  id: string
  json: JSONValue
  selectedPath: JSONPath
  onSort: OnSort
  onClose: () => void
}
