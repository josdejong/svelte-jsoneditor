import type { JSONPatchDocument, JSONPath, JSONPointer } from 'immutable-json-patch'
import type { SvelteComponent } from 'svelte'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'

export type TextContent = { text: string }

export type JSONContent = { json: unknown }

export type Content = JSONContent | TextContent

// The `JSONParser` interface is compatible with `JSON`,
// except that JSON.stringify is wrongly defined to return a string whilst it can return a string or undefined
// see: https://stackoverflow.com/questions/74461780/is-the-official-type-definition-for-json-stringify-wrong
export interface JSONParser {
  parse(
    text: string,
    reviver?: ((this: unknown, key: string, value: unknown) => unknown) | null
  ): unknown

  stringify(
    value: unknown,
    replacer?:
      | ((this: unknown, key: string, value: unknown) => unknown)
      | Array<number | string>
      | null,
    space?: string | number
  ): string | undefined
}

export interface JSONPathParser {
  parse: (pathStr: string) => JSONPath
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
  multi = 'multi',
  text = 'text' // in text mode
}

export enum CaretType {
  after = 'after',
  key = 'key',
  value = 'value',
  inside = 'inside'
}

export interface PathOption {
  value: JSONPath
  label: string
}

export interface NumberOption {
  value: 1 | -1
  label: string
}

export interface CaretPosition {
  path: JSONPath
  type: CaretType // TODO: refactor this to use SelectionType here, then we can simplify the util functions to turn this into a selection
}

export interface DocumentState {
  expandedMap: JSONPointerMap<boolean>
  enforceStringMap: JSONPointerMap<boolean>
  visibleSectionsMap: JSONPointerMap<VisibleSection[]>
  selection: JSONSelection | null
  sortedColumn: SortedColumn | null
}

export interface JSONPatchResult {
  json: unknown
  previousJson: unknown
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export type AfterPatchCallback = (
  patchedJson: unknown,
  patchedState: DocumentState
) => { json?: unknown; state?: DocumentState } | undefined

export interface MultiSelection {
  type: SelectionType.multi
  anchorPath: JSONPath
  focusPath: JSONPath
}

export interface AfterSelection {
  type: SelectionType.after
  path: JSONPath
}

export interface InsideSelection {
  type: SelectionType.inside
  path: JSONPath
}

export interface KeySelection {
  type: SelectionType.key
  path: JSONPath
  edit?: boolean
}

export interface ValueSelection {
  type: SelectionType.value
  path: JSONPath
  edit?: boolean
}

export type JSONSelection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | ValueSelection

// TextSelection is the result of EditorSelection.toJSON() from CodeMirror,
// with an additional `type` property
export interface TextSelection {
  type: SelectionType.text
  ranges: { anchor: number; head: number }[]
  main: number
}

export type JSONEditorSelection = JSONSelection | TextSelection

export type JSONPointerMap<T> = Record<JSONPointer, T>

export type ClipboardValues = Array<{ key: string; value: unknown }>

export interface MenuButton {
  type: 'button'
  onClick: (event: MouseEvent) => void
  icon?: IconDefinition
  text?: string
  title?: string
  className?: string
  disabled?: boolean
}

export interface MenuDropDownButton {
  type: 'dropdown-button'
  main: MenuButton
  width?: string
  items: MenuButton[]
}

export interface MenuLabel {
  type: 'label'
  text: string
}

export interface MenuSeparator {
  type: 'separator'
}

export interface MenuSpace {
  type: 'space'
}

export type MenuItem = MenuButton | MenuSeparator | MenuSpace

export interface ContextMenuColumn {
  type: 'column'
  items: Array<MenuButton | MenuDropDownButton | MenuLabel | MenuSeparator>
}
export interface ContextMenuRow {
  type: 'row'
  items: Array<MenuButton | MenuDropDownButton | ContextMenuColumn>
}
export type ContextMenuItem = MenuButton | MenuDropDownButton | MenuSeparator | ContextMenuRow

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

export type Validator = (json: unknown) => ValidationError[]

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
  line: number | null
  column: number | null
  from: number | null
  to: number | null
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
  createQuery: (json: unknown, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: unknown, query: string, parser: JSONParser) => unknown
}

export interface QueryLanguageOptions {
  filter?: {
    path?: JSONPath
    relation?: '==' | '!=' | '<' | '<=' | '>' | '>='
    value?: string
  }
  sort?: {
    path?: JSONPath
    direction?: 'asc' | 'desc'
  }
  projection?: {
    paths?: JSONPath[]
  }
}

export type OnChangeQueryLanguage = (queryLanguageId: string) => void
export interface OnChangeStatus {
  contentErrors: ContentErrors | null
  patchResult: JSONPatchResult | null
}
export type OnChange =
  | ((content: Content, previousContent: Content, status: OnChangeStatus) => void)
  | null
export type OnJSONSelect = (selection: JSONSelection) => void
export type OnSelect = (selection: JSONEditorSelection | null) => void
export type OnPatch = (
  operations: JSONPatchDocument,
  afterPatch?: AfterPatchCallback
) => JSONPatchResult
export type OnChangeText = (updatedText: string, afterPatch?: AfterPatchCallback) => void
export type OnSort = (params: {
  operations: JSONPatchDocument
  rootPath: JSONPath
  itemPath: JSONPath
  direction: 1 | -1
}) => void
export type OnFind = (findAndReplace: boolean) => void
export type OnPaste = (pastedText: string) => void
export type OnPasteJson = (pastedJson: { path: JSONPath; contents: unknown }) => void
export type OnExpand = (path: JSONPath) => boolean
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: JSONPath, value: unknown) => string | undefined
export type OnChangeMode = (mode: Mode) => void
export type OnContextMenu = (contextMenuProps: AbsolutePopupOptions) => void
export type RenderMenuContext = {
  mode: 'tree' | 'text' | 'table'
  modal: boolean
  selection: JSONEditorSelection | null
}
export type OnRenderMenu = (items: MenuItem[], context: RenderMenuContext) => MenuItem[] | undefined
export type OnRenderMenuInternal = (items: MenuItem[]) => MenuItem[]
export type OnRenderContextMenu = (
  items: ContextMenuItem[],
  context: RenderMenuContext
) => ContextMenuItem[] | undefined
export type OnRenderContextMenuInternal = (items: ContextMenuItem[]) => ContextMenuItem[]
export type OnError = (error: Error) => void
export type OnFocus = () => void
export type OnBlur = () => void
export type OnSortModal = (props: SortModalCallback) => void
export type OnTransformModal = (props: TransformModalCallback) => void
export type OnJSONEditorModal = (props: JSONEditorModalCallback) => void
export type FindNextInside = (path: JSONPath) => JSONSelection | null

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

export type EscapeValue = (value: unknown) => string

export type UnescapeValue = (escapedValue: string) => string

export interface ValueNormalization {
  escapeValue: EscapeValue
  unescapeValue: UnescapeValue
}

export type PastedJson = { contents: unknown; path: JSONPath } | undefined

export interface DragInsideProps {
  json: unknown
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
    json: unknown | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
  redo: {
    patch: JSONPatchDocument | undefined
    json: unknown | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
}

export type InsertType = 'value' | 'object' | 'array' | 'structure'

export interface PopupEntry {
  id: number
  component: typeof SvelteComponent<Record<string, unknown>>
  props: Record<string, unknown>
  options: AbsolutePopupOptions
}

export interface AbsolutePopupOptions {
  anchor?: Element
  position?: 'top' | 'left'
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

export interface AbsolutePopupContext {
  openAbsolutePopup: (
    component: typeof SvelteComponent<Record<string, unknown>>,
    props: Record<string, unknown>,
    options: AbsolutePopupOptions
  ) => number
  closeAbsolutePopup: (popupId: number | undefined) => void
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
  askToFormat?: boolean
  escapeControlCharacters?: boolean
  escapeUnicodeCharacters?: boolean
  flattenColumns?: true
  parser?: JSONParser
  validator?: Validator | null
  validationParser?: JSONParser
  pathParser?: JSONPathParser

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
  getJson: () => unknown | undefined
  getDocumentState: () => DocumentState
  findElement: (path: JSONPath) => Element | null
  findNextInside: FindNextInside
  focus: () => void
  onPatch: OnPatch
  onSelect: OnJSONSelect
  onFind: OnFind
  onPasteJson: (newPastedJson: PastedJson) => void
  onRenderValue: OnRenderValue
}

export interface TreeModeContext extends JSONEditorContext {
  getJson: () => unknown | undefined
  getDocumentState: () => DocumentState
  findElement: (path: JSONPath) => Element | null
  onInsert: (type: InsertType) => void
  onExpand: (path: JSONPath, expanded: boolean, recursive?: boolean) => void
  onExpandSection: (path: JSONPath, section: Section) => void
  onContextMenu: OnContextMenu
  onClassName: OnClassName
  onDrag: (event: MouseEvent) => void
  onDragEnd: () => void
}

export interface RenderValueProps {
  path: JSONPath
  value: unknown
  readOnly: boolean
  enforceString: boolean
  selection: JSONSelection | null
  searchResultItems: SearchResultItem[] | undefined
  isEditing: boolean
  parser: JSONParser
  normalization: ValueNormalization
  onPatch: OnPatch
  onPasteJson: OnPasteJson
  onSelect: OnJSONSelect
  onFind: OnFind
  findNextInside: FindNextInside
  focus: () => void
}

export type RenderValuePropsOptional = Partial<RenderValueProps>

export interface JSONNodeProp {
  key: string
  value: unknown
  path: JSONPath
  expandedMap: JSONPointerMap<boolean> | undefined
  enforceStringMap: JSONPointerMap<boolean> | undefined
  visibleSectionsMap: JSONPointerMap<VisibleSection[]> | undefined
  validationErrorsMap: JSONPointerMap<NestedValidationError> | undefined
  keySearchResultItemsMap: ExtendedSearchResultItem[] | undefined
  valueSearchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]> | undefined
  selection: JSONSelection | null
}

export interface JSONNodeItem {
  index: number
  value: unknown
  path: JSONPath
  expandedMap: JSONPointerMap<boolean> | undefined
  enforceStringMap: JSONPointerMap<boolean> | undefined
  visibleSectionsMap: JSONPointerMap<VisibleSection[]> | undefined
  validationErrorsMap: JSONPointerMap<NestedValidationError> | undefined
  searchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]> | undefined
  selection: JSONSelection | null
}

export interface DraggingState {
  initialTarget: Element
  initialClientY: number
  initialContentTop: number
  selectionStartIndex: number
  selectionItemsCount: number
  items: RenderedItem[]
  offset: number
  didMoveItems: boolean
}

export interface RenderValueComponentDescription {
  component: typeof SvelteComponent<RenderValuePropsOptional>
  props: Record<string, unknown>
}

export interface TransformModalOptions {
  id?: string
  rootPath?: JSONPath
  onTransform?: (state: {
    operations: JSONPatchDocument
    json: unknown
    transformedJson: unknown
  }) => void
  onClose?: () => void
}

export interface TransformModalCallback {
  id: string
  rootPath: JSONPath
  json: unknown
  onTransform: (operations: JSONPatchDocument) => void
  onClose: () => void
}

export interface SortModalCallback {
  id: string
  json: unknown
  rootPath: JSONPath
  onSort: OnSort
  onClose: () => void
}

export interface JSONEditorModalCallback {
  content: Content
  path: JSONPath
  onPatch: OnPatch
  onClose: () => void
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc'
}

export enum UpdateSelectionAfterChange {
  no = 'no',
  self = 'self',
  nextInside = 'nextInside'
}

export interface TableCellIndex {
  rowIndex: number
  columnIndex: number
}

export interface SortedColumn {
  path: JSONPath
  sortDirection: SortDirection
}

// TODO: work out the JSONSchema type in detail.
//  Ideally, we use use Schema from Ajv, but this interface isn't worked out either
export type JSONSchema = Record<string, unknown>
export type JSONSchemaDefinitions = Record<string, JSONSchema>
export type JSONSchemaEnum = Array<unknown>
