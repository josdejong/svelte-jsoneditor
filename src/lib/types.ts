import type { JSONData, JSONPatchDocument, JSONPath, JSONPointer } from 'immutable-json-patch'
import type { SvelteComponent } from 'svelte'

export type TextContent = { text: string } | { json: undefined; text: string }

export type JSONContent = { json: JSONData } | { json: JSONData; text: undefined }

export type Content = JSONContent | TextContent

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
  path: JSONPath
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
  path?: JSONPath
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
export type OnSelect = (selection: JSONSelection) => void
export type OnPatch = (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => void
export type OnSort = (operations: JSONPatchDocument) => void
export type OnFind = (findAndReplace: boolean) => void
export type OnPaste = (pastedText: string) => void
export type OnPasteJson = (pastedJson: { path: JSONPath; contents: JSONData }) => void
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: JSONPath, value: JSONData) => string | undefined
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

export type PastedJson = { contents: JSONData; path: JSONPath } | undefined

export type EscapeValue = (value: JSONData) => string

export type UnescapeValue = (escapedValue: string) => string

export interface DragInsideProps {
  json: JSONData
  selection: JSONSelection
  deltaY: number
  items: Array<{ path: JSONPath; height: number }>
}

export type DragInsideAction =
  | { beforePath: JSONPath; indexOffset: number }
  | { append: true; indexOffset: number }

export interface RenderedItem {
  path: JSONPath
  height: number
}

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
  findElement: (path: JSONPath) => Element | null
  focus: () => void
  onPatch: (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => JSONPatchResult
  onInsert: (type: InsertType) => void
  onExpand: (path: JSONPath, expanded: boolean, recursive?: boolean) => void
  onSelect: OnSelect
  onFind: OnFind
  onExpandSection: (path: JSONPath, section: Section) => void
  onPasteJson: (newPastedJson: PastedJson) => void
  onRenderValue: OnRenderValue
  onContextMenu: OnContextMenu
  onClassName: OnClassName
  onDrag: (event: Event) => void
  onDragEnd: () => void
}

export interface RenderValuePropsOptional {
  path?: JSONPath
  value?: JSONData
  readOnly?: boolean
  enforceString?: boolean
  selection?: JSONSelection
  searchResultItems?: SearchResultItem[]
  isSelected?: boolean
  isEditing?: boolean
  normalization?: ValueNormalization
  onPatch?: TreeModeContext['onPatch']
  onPasteJson?: OnPasteJson
  onSelect?: OnSelect
  onFind?: OnFind
  focus?: () => void
}

export interface RenderValueProps extends RenderValuePropsOptional {
  path: JSONPath
  value: JSONData
  readOnly: boolean
  enforceString: boolean
  selection: JSONSelection | undefined
  searchResultItems: SearchResultItem[] | undefined
  isSelected: boolean
  isEditing: boolean
  normalization: ValueNormalization
  onPatch: TreeModeContext['onPatch']
  onPasteJson: OnPasteJson
  onSelect: OnSelect
  onFind: OnFind
  focus: () => void
}

export interface DraggingState {
  initialTarget: Element
  initialClientY: number
  initialContentTop: number
  value: JSONData
  selection: JSONSelection | undefined
  expandedMap: JSONPointerMap<boolean> | undefined
  enforceStringMap: JSONPointerMap<boolean> | undefined
  visibleSectionsMap: JSONPointerMap<VisibleSection[]> | undefined
  validationErrorsMap: JSONPointerMap<ValidationError> | undefined
  searchResultItemsMap: JSONPointerMap<ExtendedSearchResultItem[]> | undefined
  items: RenderedItem[] | null
  indexOffset: number
  didMoveItems: boolean
}

// TODO: can we define proper generic types here?
export interface RenderValueComponentDescription {
  component: SvelteComponent
  props: Record<string, unknown>
}

export interface TransformModalOptions {
  id?: string
  selectedPath?: JSONPath
  onTransform?: (state: {
    operations: JSONPatchDocument
    json: JSONData
    transformedJson: JSONData
  }) => void
  onClose?: () => void
}

export interface TransformModalCallback extends TransformModalOptions {
  id: string
  selectedPath: JSONPath
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
  selectedPath: JSONPath
  onSort: OnSort
  onClose: () => void
}
