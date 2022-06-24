import type { SvelteComponent } from 'svelte'
import type { Readable } from 'svelte/store'

export type JSONValue = string | number | boolean | null
export type JSONObject = { [key: string]: JSONData }
export type JSONArray = JSONData[]
export type JSONData = JSONObject | JSONArray | JSONValue

export type TextContent = { text: string } | { json: undefined; text: string }

export type JSONContent = { json: JSONData } | { json: JSONData; text: undefined }

export type Content = JSONContent | TextContent

export type Path = Array<string | number>

export type JSONPointer = string // a Path stringified with compileJSONPointer(...)

export interface VisibleSection {
  start: number
  end: number
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
  path: Path
  type: CaretType // TODO: refactor this to use SelectionType here, then we can simplify the util functions to turn this into a selection
}

export interface DocumentState {
  // TODO: merge expandedMap, enforceStringMap, keysMap, and visibleSectionsMap into a single stateMap?
  expandedMap: JSONPointerMap<boolean>
  enforceStringMap: JSONPointerMap<boolean>
  keysMap: JSONPointerMap<string[]>
  visibleSectionsMap: JSONPointerMap<VisibleSection[]>
  selection: Selection | undefined
}

export interface JSONPatchAdd {
  op: 'add'
  path: string
  value: JSONData
}

export interface JSONPatchRemove {
  op: 'remove'
  path: string
}

export interface JSONPatchReplace {
  op: 'replace'
  path: string
  value: JSONData
}

export interface JSONPatchCopy {
  op: 'copy'
  path: string
  from: string
}

export interface JSONPatchMove {
  op: 'move'
  path: string
  from: string
}

export interface JSONPatchTest {
  op: 'test'
  path: string
  value: JSONData
}

export type JSONPatchOperation =
  | JSONPatchAdd
  | JSONPatchRemove
  | JSONPatchReplace
  | JSONPatchCopy
  | JSONPatchMove
  | JSONPatchTest

export type JSONPatchDocument = JSONPatchOperation[]

export interface JSONPatchResult {
  json: JSONData
  previousJson: JSONData
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export type AfterPatchCallback = (
  patchedJson: JSONData,
  patchedState: DocumentState
) => { json?: JSONData; state?: DocumentState }

export interface MultiSelection {
  type: SelectionType.multi
  paths: Path[]
  anchorPath: Path
  focusPath: Path
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface AfterSelection {
  type: SelectionType.after
  anchorPath: Path
  focusPath: Path
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface InsideSelection {
  type: SelectionType.inside
  anchorPath: Path
  focusPath: Path
  pointersMap: { [pointer: JSONPointer]: boolean }
}

export interface KeySelection {
  type: SelectionType.key
  anchorPath: Path
  focusPath: Path
  pointersMap: { [pointer: JSONPointer]: boolean }
  edit?: boolean
}

export interface ValueSelection {
  type: SelectionType.value
  anchorPath: Path
  focusPath: Path
  pointersMap: { [pointer: JSONPointer]: boolean }
  edit?: boolean
}

export type Selection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | ValueSelection

export type JSONPointerMap<T> = { [pointer: JSONPointer]: T }

export type ClipboardValues = Array<{ key: string; value: JSONData }>

export interface FontAwesomeIcon {
  prefix: string
  iconName: string
  icon: [number, number, Array<number | string>, string, string]
}

export interface DropdownButtonItem {
  text: string
  onClick: () => void
  icon?: FontAwesomeIcon
  title?: string
}

export interface MenuButtonItem {
  onClick: () => void
  icon?: FontAwesomeIcon
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
  icon?: FontAwesomeIcon
  onClick?: () => void
  onMouseDown?: () => void
  disabled?: boolean
}

export interface ValidationError {
  path: Path
  message: string
  isChildError?: boolean
}

export type Validator = (json: JSONData) => ValidationError[]

export interface ParseError {
  position: number | null
  row: number | null
  column: number | null
  message: string
}

export interface NormalizedParseError {
  position: number | null
  line: number | null
  column: number | null
  message: string
}

export interface RichValidationError {
  path?: Path
  isChildError?: boolean
  line?: number
  column?: number
  from: number
  to: number
  message: string
  severity: 'info' | 'warning' | 'error'
  actions: Array<string>
}

export interface TextLocation {
  path: Path
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
  createQuery: (json: JSONData, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: JSONData, query: string) => JSONData
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
export type OnChange =
  | ((content: Content, previousContent: Content, patchResult: JSONPatchResult | null) => void)
  | null
export type OnSelect = (
  selection: Selection,
  options?: { ensureFocus?: boolean; nextInside?: boolean }
) => void
export type OnPatch = (operations: JSONPatchDocument) => void
export type OnSort = (operations: JSONPatchDocument) => void
export type OnFind = (findAndReplace: boolean) => void
export type OnPaste = (pastedText: string) => void
export type OnPasteJson = (pastedJson: { path: Path; contents: JSONData }) => void
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: Path, value: JSONData) => string | undefined
export type OnChangeMode = (mode: 'tree' | 'code') => void
export type OnContextMenu = (contextMenuProps: AbsolutePopupOptions) => void
export type OnRenderMenu = (
  mode: 'tree' | 'code' | 'repair',
  items: MenuItem[]
) => MenuItem[] | undefined | void
export type OnError = (error: Error) => void
export type OnFocus = () => void
export type OnBlur = () => void

export interface SearchResult {
  itemsList: ExtendedSearchResultItem[] // TODO: rename itemsList to items
  itemsMap: JSONPointerMap<ExtendedSearchResultItem[]>
  activeItem: ExtendedSearchResultItem | undefined
  activeIndex: number | -1
}

export enum SearchField {
  key = 'key',
  value = 'value'
}

export interface SearchResultItem {
  path: Path
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

export type PastedJson = { contents: JSONData; path: Path } | undefined

export type EscapeValue = (value: JSONData) => string

export type UnescapeValue = (escapedValue: string) => string

export interface DragInsideProps {
  fullSelection: Selection
  deltaY: number
  items: Array<{ path: Path; height: number }>
}

export type DragInsideAction =
  | { beforePath: Path; indexOffset: number }
  | { append: true; indexOffset: number }

export interface RenderedItem {
  path: Path
  height: number
}

// FIXME: split HistoryItem into multiple union types
export interface HistoryItem {
  undo: {
    patch: JSONPatchDocument | undefined
    json: JSONData | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
  redo: {
    patch: JSONPatchDocument | undefined
    json: JSONData | undefined
    text: string | undefined
    state: DocumentState
    textIsRepaired: boolean
  }
}

export type InsertType = 'value' | 'object' | 'array' | 'structure'

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
  mode?: 'tree' | 'code'
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

export interface TreeModeContext {
  readOnly: boolean
  normalization: ValueNormalization
  getJson: () => JSONData
  getDocumentState: () => DocumentState
  findElement: (path: Path) => Element | null
  focus: () => void
  onPatch: (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => JSONPatchResult
  onInsert: (type: InsertType) => void
  onExpand: (path: Path, expanded: boolean, recursive?: boolean) => void
  onSelect: OnSelect
  onFind: OnFind
  onExpandSection: (path: Path, section: Section) => void
  onPasteJson: (newPastedJson: PastedJson) => void
  onRenderValue: OnRenderValue
  onContextMenu: OnContextMenu
  onClassName: OnClassName
  onDrag: (event: Event) => void
  onDragEnd: () => void
}

export interface RenderValuePropsOptional {
  path?: Path
  value?: JSONData
  readOnly?: boolean
  enforceString?: boolean
  selection?: Selection
  searchResultItems?: SearchResultItem[]
  isSelected?: boolean
  isEditing?: boolean
  normalization?: ValueNormalization
  onPatch?: TreeModeContext['onPatch']
  onPasteJson?: OnPasteJson
  onSelect?: OnSelect
  onFind?: OnFind
}

export interface RenderValueProps extends RenderValuePropsOptional {
  path: Path
  value: JSONData
  readOnly: boolean
  enforceString: boolean | undefined
  selection: Selection | undefined
  searchResultItems: SearchResultItem[] | undefined
  isSelected: boolean
  isEditing: boolean
  normalization: ValueNormalization
  onPatch: TreeModeContext['onPatch']
  onPasteJson: OnPasteJson
  onSelect: OnSelect
  onFind: OnFind
}

// TODO: can we define proper generic types here?
export interface RenderValueComponentDescription {
  component: SvelteComponent
  props: Record<string, unknown>
}

export interface TransformModalOptions {
  id?: string
  selectedPath?: Path
  onTransform?: (state: {
    operations: JSONPatchDocument
    json: JSONData
    transformedJson: JSONData
  }) => void
  onClose?: () => void
}

export interface TransformModalCallback extends TransformModalOptions {
  id: string
  selectedPath: Path
  json: JSONData
  onTransform: (state: {
    operations: JSONPatchDocument
    json: JSONData
    transformedJson: JSONData
  }) => void
  onClose: () => void
}

export interface SortModalCallback {
  id: string
  json: JSONData
  selectedPath: Path
  onSort: OnSort
  onClose: () => void
}
