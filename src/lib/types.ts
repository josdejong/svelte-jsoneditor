import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
import type { Component, SvelteComponent } from 'svelte'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import type { Action } from 'svelte/action'

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

export interface ObjectRecursiveState {
  type: 'object'
  properties: Record<string, RecursiveState | undefined>
}

export interface ArrayRecursiveState {
  type: 'array'
  items: Array<RecursiveState | undefined>
}

export interface ValueRecursiveState {
  type: 'value'
}

export type RecursiveState = ObjectRecursiveState | ArrayRecursiveState | ValueRecursiveState

export interface RecursiveStateFactory {
  createObjectDocumentState: () => ObjectRecursiveState
  createArrayDocumentState: () => ArrayRecursiveState
  createValueDocumentState: () => ValueRecursiveState
}

export interface ObjectDocumentState extends ObjectRecursiveState {
  type: 'object'
  properties: Record<string, DocumentState | undefined>
  expanded: boolean
}

export interface ArrayDocumentState extends ArrayRecursiveState {
  type: 'array'
  items: Array<DocumentState | undefined>
  expanded: boolean
  visibleSections: VisibleSection[]
}

export interface ValueDocumentState extends ValueRecursiveState {
  type: 'value'
  enforceString?: boolean
}

export type DocumentState = ObjectDocumentState | ArrayDocumentState | ValueDocumentState

export interface ObjectSearchResults extends ObjectRecursiveState {
  type: 'object'
  properties: Record<string, SearchResults | undefined>
  searchResults?: ExtendedSearchResultItem[]
}

export interface ArraySearchResults extends ArrayRecursiveState {
  type: 'array'
  items: Array<SearchResults | undefined>
  searchResults?: ExtendedSearchResultItem[]
}

export interface ValueSearchResults extends ValueRecursiveState {
  type: 'value'
  searchResults?: ExtendedSearchResultItem[]
}

export type SearchResults = ObjectSearchResults | ArraySearchResults | ValueSearchResults

export type WithSearchResults = SearchResults & {
  searchResults: ExtendedSearchResultItem[]
}

export interface ObjectValidationErrors extends ObjectRecursiveState {
  type: 'object'
  properties: Record<string, ValidationErrors | undefined>
  validationError?: NestedValidationError
}

export interface ArrayValidationErrors extends ArrayRecursiveState {
  type: 'array'
  items: Array<ValidationErrors | undefined>
  validationError?: NestedValidationError
}

export interface ValueValidationErrors extends ValueRecursiveState {
  type: 'value'
  validationError?: NestedValidationError
}

export type ValidationErrors =
  | ObjectValidationErrors
  | ArrayValidationErrors
  | ValueValidationErrors

export interface JSONPatchResult {
  json: unknown
  previousJson: unknown
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export type AfterPatchCallback = (
  patchedJson: unknown,
  patchedState: DocumentState | undefined,
  patchedSelection: JSONSelection | undefined
) =>
  | {
      json?: unknown
      state?: DocumentState | undefined
      selection?: JSONSelection | undefined
      sortedColumn?: SortedColumn | undefined
    }
  | undefined

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
}

export interface EditKeySelection extends KeySelection {
  type: SelectionType.key
  path: JSONPath
  edit: true
  initialValue?: string
}

export type ValueSelection = {
  type: SelectionType.value
  path: JSONPath
}

export interface EditValueSelection extends ValueSelection {
  type: SelectionType.value
  path: JSONPath
  edit: true
  initialValue?: string
}

export type JSONSelection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | EditKeySelection
  | ValueSelection
  | EditValueSelection

// TextSelection is the result of EditorSelection.toJSON() from CodeMirror,
// with an additional `type` property
export interface TextSelection {
  type: SelectionType.text
  ranges: { anchor: number; head: number }[]
  main: number
}

export type JSONEditorSelection = JSONSelection | TextSelection

export interface ScrollToOptions {
  scrollToWhenVisible?: boolean
  element?: Element
}

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
  position: number | undefined
  line: number | undefined
  column: number | undefined
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
  line: number | undefined
  column: number | undefined
  from: number | undefined
  to: number | undefined
  actions: Array<{ name: string; apply: () => void }> | undefined
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
  contentErrors: ContentErrors | undefined
  patchResult: JSONPatchResult | undefined
}
export type OnChange =
  | ((content: Content, previousContent: Content, status: OnChangeStatus) => void)
  | undefined
export type OnJSONSelect = (selection: JSONSelection) => void
export type OnSelect = (selection: JSONEditorSelection | undefined) => void
export type OnUndo = (item: HistoryItem | undefined) => void
export type OnRedo = (item: HistoryItem | undefined) => void
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
export type OnPasteJson = (pastedJson: PastedJson) => void
export type OnExpand = (relativePath: JSONPath) => boolean
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: JSONPath, value: unknown) => string | undefined
export type OnChangeMode = (mode: Mode) => void
export type OnContextMenu = (contextMenuProps: AbsolutePopupOptions) => void
export type RenderMenuContext = {
  mode: Mode
  modal: boolean
  readOnly: boolean
}
export type OnRenderMenu = (items: MenuItem[], context: RenderMenuContext) => MenuItem[] | undefined
export type OnRenderMenuInternal = (items: MenuItem[]) => MenuItem[] | undefined
export type RenderContextMenuContext = RenderMenuContext & {
  selection: JSONEditorSelection | undefined
}
export type OnRenderContextMenu = (
  items: ContextMenuItem[],
  context: RenderContextMenuContext
) => ContextMenuItem[] | false | undefined
export type OnRenderContextMenuInternal = (
  items: ContextMenuItem[]
) => ContextMenuItem[] | false | undefined
export type OnError = (error: Error) => void
export type OnFocus = () => void
export type OnBlur = () => void
export type OnSortModal = (props: SortModalCallback) => void
export type OnTransformModal = (props: TransformModalCallback) => void
export type OnJSONEditorModal = (props: JSONEditorModalCallback) => void
export type FindNextInside = (path: JSONPath) => JSONSelection | undefined

export interface SearchResultDetails {
  items: ExtendedSearchResultItem[]
  activeItem: ExtendedSearchResultItem | undefined
  activeIndex: number | -1
}

export enum SearchField {
  key = 'key',
  value = 'value'
}

export interface SearchOptions {
  maxResults?: number
  columns?: JSONPath[]
}

export interface SearchResultItem {
  path: JSONPath
  field: SearchField
  fieldIndex: number
  start: number
  end: number
}

export interface ExtendedSearchResultItem extends SearchResultItem {
  resultIndex: number
  active: boolean
}

export type EscapeValue = (value: unknown) => string

export type UnescapeValue = (escapedValue: string) => string

export interface ValueNormalization {
  escapeValue: EscapeValue
  unescapeValue: UnescapeValue
}

export type PastedJson = {
  path: JSONPath
  contents: unknown
  onPasteAsJson: () => void
}

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

export interface TreeHistoryItem {
  type: 'tree'
  undo: {
    patch: JSONPatchDocument | undefined
    json: unknown | undefined
    text: string | undefined
    documentState: DocumentState | undefined
    selection: JSONSelection | undefined
    sortedColumn: SortedColumn | undefined
    textIsRepaired: boolean
  }
  redo: {
    patch: JSONPatchDocument | undefined
    json: unknown | undefined
    text: string | undefined
    documentState: DocumentState | undefined
    selection: JSONSelection | undefined
    sortedColumn: SortedColumn | undefined
    textIsRepaired: boolean
  }
}

export type TextChanges = Array<number | [number, ...string[]]>

export interface TextHistoryItem {
  type: 'text'
  undo: {
    changes: TextChanges
    selection: TextSelection
  }
  redo: {
    changes: TextChanges
    selection: TextSelection
  }
}

export interface ModeHistoryItem {
  type: 'mode'
  undo: {
    mode: Mode
    selection: undefined // selection can be restored used the corresponding sibling HistoryItem
  }
  redo: {
    mode: Mode
    selection: undefined // selection can be restored used the corresponding sibling HistoryItem
  }
}

export type HistoryItem = TreeHistoryItem | TextHistoryItem | ModeHistoryItem

export interface HistoryInstance<T> {
  get: () => History<T>
}

export interface History<T> {
  canUndo: boolean
  canRedo: boolean
  items: () => T[]
  add: (item: T) => void
  clear: () => void
  undo: () => T | undefined
  redo: () => T | undefined
}

export type ConvertType = 'value' | 'object' | 'array'
export type InsertType = ConvertType | 'structure'

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
  selection?: JSONEditorSelection
  readOnly?: boolean
  indentation?: number | string
  tabSize?: number
  truncateTextSize?: number
  mode?: Mode
  mainMenuBar?: boolean
  navigationBar?: boolean
  statusBar?: boolean
  askToFormat?: boolean
  escapeControlCharacters?: boolean
  escapeUnicodeCharacters?: boolean
  flattenColumns?: boolean
  parser?: JSONParser
  validator?: Validator | undefined
  validationParser?: JSONParser
  pathParser?: JSONPathParser

  queryLanguages?: QueryLanguage[]
  queryLanguageId?: string

  onChangeQueryLanguage?: OnChangeQueryLanguage
  onChange?: OnChange
  onRenderValue?: OnRenderValue
  onClassName?: OnClassName
  onRenderMenu?: OnRenderMenu
  onRenderContextMenu?: OnRenderContextMenu
  onChangeMode?: OnChangeMode
  onSelect?: OnSelect
  onError?: OnError
  onFocus?: OnFocus
  onBlur?: OnBlur
  language?: Language
}

export interface JSONEditorModalProps {
  content: Content
  path: JSONPath
  onPatch: OnPatch

  readOnly: boolean
  indentation: number | string
  tabSize: number
  truncateTextSize: number
  mainMenuBar: boolean
  navigationBar: boolean
  statusBar: boolean
  askToFormat: boolean
  escapeControlCharacters: boolean
  escapeUnicodeCharacters: boolean
  flattenColumns: boolean
  parser: JSONParser
  validator: Validator | undefined
  validationParser: JSONParser
  pathParser: JSONPathParser

  onRenderValue: OnRenderValue
  onClassName: OnClassName
  onRenderMenu: OnRenderMenu
  onRenderContextMenu: OnRenderContextMenu
  onSortModal: (props: SortModalCallback) => void
  onTransformModal: (props: TransformModalCallback) => void
  onClose: () => void
}

export interface JSONEditorContext {
  mode: Mode
  readOnly: boolean
  truncateTextSize: number
  parser: JSONParser
  normalization: ValueNormalization
  getJson: () => unknown | undefined
  getDocumentState: () => DocumentState | undefined
  findElement: (path: JSONPath) => Element | undefined
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
  getDocumentState: () => DocumentState | undefined
  getSelection: () => JSONSelection | undefined
  findElement: (path: JSONPath) => Element | undefined
  onInsert: (type: InsertType) => void
  onExpand: (path: JSONPath, expanded: boolean, recursive?: boolean) => void
  onExpandSection: (path: JSONPath, section: Section) => void
  onContextMenu: OnContextMenu
  onClassName: OnClassName
  onDrag: (event: MouseEvent) => void
  onDragEnd: () => void
}

export interface RenderValueProps extends Record<string, unknown> {
  path: JSONPath
  value: unknown
  mode: Mode
  truncateTextSize: number
  readOnly: boolean
  enforceString: boolean
  selection: JSONSelection | undefined
  searchResultItems: ExtendedSearchResultItem[] | undefined
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

export type RenderValueComponentDescription = SvelteComponentRenderer | SvelteActionRenderer

export interface SvelteComponentRenderer {
  component:
    | typeof SvelteComponent<RenderValuePropsOptional> // Classic Svelte component
    | Component<RenderValueProps> // Runes
  props: RenderValueProps
}

export interface SvelteActionRenderer {
  action: Action<HTMLElement, Record<string, unknown>>
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
  json: unknown
  rootPath: JSONPath
  onTransform: (operations: JSONPatchDocument) => void
  onClose: () => void
}

export interface TransformModalProps extends TransformModalCallback {
  id: string
  json: unknown
  rootPath: JSONPath
  indentation: number | string
  truncateTextSize: number
  escapeControlCharacters: boolean
  escapeUnicodeCharacters: boolean
  parser: JSONParser
  parseMemoizeOne: JSONParser['parse']
  validationParser: JSONParser
  pathParser: JSONPathParser

  queryLanguages: QueryLanguage[]
  queryLanguageId: string
  onChangeQueryLanguage: OnChangeQueryLanguage

  onRenderValue: OnRenderValue
  onRenderMenu: OnRenderMenuInternal
  onRenderContextMenu: OnRenderContextMenuInternal
  onClassName: OnClassName

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

export interface JSONRepairModalProps {
  text: string
  onParse: (text: string) => void
  onRepair: (text: string) => string
  onApply: (repairedText: string) => void
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

export type Language = {
  landCode: string
  values: Locale
}

export type TranslationKey = {
  // Common
  Ok: string
  loading: string
  filter: string
  Extract: string
  View: string
  Edit: string
  sort: string
  anObject: string
  insertExplanation: string
  showMe: string
  moveToError: string
  autoRepair: string
  autoRepairJson: string
  item: string
  items: string
  editNestedContent: string
  contents: string
  back: string
  apply: string
  selectQueryLanguage: string
  pick: string
  language: string
  query: string
  docRoot: string

  // textMode
  cancel: string
  cancelFolding: string
  openAnyWay: string
  openTextModeWarning: string
  openTreeMode: string
  openTreeModeDescription: string
  cancelLargeDocument: string
  confirmFormatJson: string
  format: string
  noThanks: string
  closeMessage: string
  jsonTooLargeWarning: string

  // TreeMode messages
  invalidJsonNotRepairable: string
  repairManually: string
  repairManuallyTitle: string
  pastedJsonAsText: string
  pasteAsJson: string
  replaceValueWithJson: string
  pastTextAsJson: string
  keepAsSingleValue: string
  leaveAsIs: string
  leaveAsIsTitle: string
  multilinePastedAsArray: string
  pasteAsStrInstead: string
  pasteAsStrInsteadTitle: string
  autoRepairSuccess: string
  acceptRepair: string
  acceptRepairTitle: string
  repairManuallyInsteadTitle: string

  // Menu titles
  expandAll: string
  collapseAll: string
  search: string
  transformContents: string
  contextMenuExplanation: string
  undo: string
  redo: string
  copy: string
  formatJson: string
  compactJson: string

  // SearchBox messages
  toggleReplaceOptions: string
  enterTextSearch: string
  findPlaceholder: string
  nextResult: string
  prevResult: string
  closeSearch: string
  enterReplaceText: string
  replace: string
  replaceAll: string
  replaceCtrlEnter: string
  replaceAllTitle: string

  // Sort direction names
  sortAscending: string
  sortDescending: string

  // Mode switching messages
  modeText: string
  modeTree: string
  modeTable: string
  switchToTextMode: string
  switchToTreeMode: string
  switchToTableMode: string
  currentMode: string

  // Table mode
  failedToValidate: string
  tipContextMenu: string
  YouPastedAJsonMessage: string
  multilineTextPastedMessage: string
  pasteAsStringInstead: string
  pastSingleString: string
  keepThePastedArray: string
  textRepairedSuccessMessage: string
  acceptRepairedDocument: string
  leaveTheDocUnchanged: string
  manuallyRepairWithCodeModeText: string

  // Table mode welcome
  objectWithNestedArrays: string
  emptyDocument: string
  object: string
  emptyArray: string
  withValueType: string
  objectCannotBeOpened: string
  emptyDocCannotBeOpened: string
  docCannotBeOpened: string
  tableCell: string
  tableRow: string

  // Context menu
  editKey: string
  paste: string
  remove: string
  editRow: string
  editCurrentRow: string
  duplicateRow: string
  duplicateCurrentRow: string
  insertBefore: string
  insertRowBeforeCurrentRow: string
  insertAfter: string
  insertRowAfterCurrentRow: string
  removeRow: string
  removeCurrentRow: string
  cut: string
  cutFormattedTitle: string
  cutCompactedTitle: string
  copyWithIndent: string
  copyWithoutIndent: string
  pasteTitle: string
  removeSelected: string
  copyFormatted: string
  copyCompacted: string
  enforceString: string
  enforceKeepingTheValue: string
  editValue: string
  cutFormatted: string
  cutCompacted: string
  extractSelectedContent: string
  duplicate: string
  duplicateSelectedContents: string
  editArray: string
  editObject: string
  convertTo: string
  insert: string
  editTheKey: string
  sortArrayOrObject: string
  transform: string
  transformArrayOrObject: string
  structure: string
  structureTitle: string
  array: string
  value: string
  selectAreaBeforeCurrentEntry: string
  selectAreaAfterCurrentEntry: string

  sortObjectKeys: string
  sortArrayItems: string
  selectedPath: string
  direction: string
  property: string
  path: string
  wizard: string
  wizardInfo: string
  original: string
  preview: string
}

export type Locale = {
  [key in keyof TranslationKey]: string
}
