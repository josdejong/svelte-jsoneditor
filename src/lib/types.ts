import type { SvelteComponent } from 'svelte'

export type JSONData = { [key: string]: JSONData } | JSONData[] | string | number | boolean | null

export type TextContent = { text: string } | { json: undefined; text: string }

export type JSONContent = { json: JSONData } | { json: JSONData; text: undefined }

export type Content = JSONContent | TextContent

export type Path = Array<string | number | symbol>

export type CaretType = 'after' | 'key' | 'value' | 'append'

export interface VisibleSection {
  start: number
  end: number
}

export interface CaretPosition {
  path: Path
  type: CaretType
}

export interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: string
  from?: string
  value?: JSONData
}

export interface PreprocessedJSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: Path
  from?: Path
  value?: JSONData
}

export type JSONPatchDocument = JSONPatchOperation[]

export interface JSONPatchResult {
  json: JSONData
  previousJson: JSONData
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export interface JSONPatchOptions {
  before?: (
    json: JSONData,
    operation: PreprocessedJSONPatchOperation
  ) => { json?: JSONData; operation?: PreprocessedJSONPatchOperation } | undefined
  after?: (
    json: JSONData,
    operation: PreprocessedJSONPatchOperation,
    previousJson: JSONData
  ) => JSONData
}

export type AfterPatchCallback = (
  patchedJson: JSONData,
  patchedState: JSONData,
  selection: Selection
) => { json?: JSONData; state?: JSONData; selection?: Selection }

export interface MultiSelection {
  type: 'multi'
  paths: Path[]
  anchorPath: Path
  focusPath: Path
  pathsMap: { [key: string]: boolean }
}

export interface AfterSelection {
  type: 'after'
  anchorPath: Path
  focusPath: Path
}

export interface InsideSelection {
  type: 'inside'
  anchorPath: Path
  focusPath: Path
}

export interface KeySelection {
  type: 'key'
  anchorPath: Path
  focusPath: Path
  edit?: boolean
}

export interface ValueSelection {
  type: 'value'
  anchorPath: Path
  focusPath: Path
  edit?: boolean
}

export type Selection =
  | MultiSelection
  | AfterSelection
  | InsideSelection
  | KeySelection
  | ValueSelection

export type RecursiveSelection = { [key: string]: RecursiveSelection } | Array<RecursiveSelection>

export interface AfterSelectionSchema {
  type: 'after'
  path: Path
}

export interface InsideSelectionSchema {
  type: 'inside'
  path: Path
}

export interface KeySelectionSchema {
  type: 'key'
  path: Path
  edit?: boolean
  next?: boolean
}

export interface ValueSelectionSchema {
  type: 'value'
  path: Path
  edit?: boolean
  next?: boolean
  nextInside?: boolean
}

export interface MultiSelectionSchema {
  type: 'multi'
  anchorPath: Path
  focusPath: Path
}

export type SelectionSchema =
  | MultiSelectionSchema
  | AfterSelectionSchema
  | InsideSelectionSchema
  | KeySelectionSchema
  | ValueSelectionSchema

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

export function isMenuSpaceItem(item: unknown): item is MenuSpaceItem {
  return item && item['space'] === true && Object.keys(item).length === 1
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
  selectionSchema: SelectionSchema,
  options?: { ensureFocus?: boolean }
) => void
export type OnPatch = (operations: JSONPatchDocument) => void
export type OnSort = (operations: JSONPatchDocument) => void
export type OnFind = (findAndReplace: boolean) => void
export type OnPaste = (pastedText: string) => void
export type OnPasteJson = (pastedJson: { path: Path; contents: JSONData }) => void
export type OnRenderValue = (props: RenderValueProps) => RenderValueComponentDescription[]
export type OnClassName = (path: Path, value: JSONData) => string | undefined | void
export type OnChangeMode = (mode: 'tree' | 'code') => void
export type OnContextMenu = (contextMenuProps: ContextMenuProps) => void
export type OnRenderMenu = (
  mode: 'tree' | 'code' | 'repair',
  items: MenuItem[]
) => MenuItem[] | undefined | void
export type OnError = (error: Error) => void
export type OnFocus = () => void
export type OnBlur = () => void

export type RecursiveSearchResult = { [key: string]: RecursiveSearchResult }

export interface SearchResult {
  items: RecursiveSearchResult
  itemsWithActive: RecursiveSearchResult
  flatItems: Path[]
  activeItem: Path
  activeIndex: number
  count: number
}

export interface SearchResultItem {
  path: Path
  field: symbol
  fieldIndex: number
  start: number
  end: number
  active: boolean
}

export interface ValueNormalization {
  escapeValue: (unescapedValue: unknown) => string
  unescapeValue: (escapedValue: string) => string
}

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

export type InsertType = 'value' | 'object' | 'array' | 'structure'

export interface ContextMenuProps {
  anchor: Element
  left: number
  top: number
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
  showTip: boolean
}

export interface TreeModeContext {
  readOnly: boolean
  showTip: boolean
  normalization: ValueNormalization
  getFullJson: () => JSONData
  getFullState: () => JSONData
  getFullSelection: () => Selection
  findElement: (path: Path) => Element | null
  focus: () => void
  onPatch: (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => void
  onInsert: (type: InsertType) => void
  onExpand: (path: Path, expanded: boolean, recursive?: boolean) => void
  onSelect: OnSelect
  onFind: OnFind
  onExpandSection: (path: Path, section: Section) => void
  onRenderValue: (props: RenderValueProps) => RenderValueComponentDescription[]
  onContextMenu: OnContextMenu
  onClassName: (path: Path, value: JSONData) => string
  onDrag: (event: Event) => void
  onDragEnd: (event: Event) => void
}

export interface RenderValuePropsOptional {
  path?: Path
  value?: JSONData
  readOnly?: boolean
  enforceString?: boolean
  selection?: Selection
  searchResult?: SearchResultItem
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
  searchResult: SearchResultItem | undefined
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
