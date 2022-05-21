export type JSON = { [key: string]: JSON } | JSON[] | string | number | boolean | null

export type TextContent = { text: string } | { json: undefined; text: string }

export type JSONContent = { json: JSON } | { json: JSON; text: undefined }

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
  value?: JSON
}

export interface PreprocessedJSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: Path
  from?: Path
  value?: JSON
}

export type JSONPatchDocument = JSONPatchOperation[]

export interface JSONPatchResult {
  json: JSON
  previousJson: JSON
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

export interface JSONPatchOptions {
  before?: (
    json: JSON,
    operation: PreprocessedJSONPatchOperation
  ) => { json?: JSON; operation?: PreprocessedJSONPatchOperation } | undefined
  after?: (json: JSON, operation: PreprocessedJSONPatchOperation, previousJson: JSON) => JSON
}

export type AfterPatchCallback = (
  patchedJson: JSON,
  patchedState: JSON,
  selection: Selection
) => { json?: JSON; state?: JSON; selection?: Selection }

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

export type ClipboardValues = Array<{ key: string; value: JSON }>

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

export interface ValidationError {
  path: Path
  message: string
  isChildError?: boolean
}

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
  createQuery: (json: JSON, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: JSON, query: string) => JSON
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
}

export interface ValueNormalization {
  escapeValue: (unescapedValue: unknown) => string
  unescapeValue: (escapedValue: string) => string
}

export type EscapeValue = (value: JSON) => string

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
  getFullJson: () => JSON
  getFullState: () => JSON
  getFullSelection: () => Selection
  findElement: (path: Path) => Element | null
  focus: () => void
  onPatch: (operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) => void
  onInsert: (type: InsertType) => void
  onExpand: (path: Path, expanded: boolean, recursive?: boolean) => void
  onSelect: { selectionSchema: SelectionSchema; options?: { ensureFocus?: boolean } }
  onFind: (findAndReplace: boolean) => void
  onExpandSection: (path: Path, section: Section) => void
  onRenderValue: (props: RenderValueProps) => RenderValueConstructor[]
  onContextMenu: (contextMenuProps: ContextMenuProps) => void
  onClassName: (path: Path, value: JSON) => string
  onDrag: (event: Event) => void
  onDragEnd: (event: Event) => void
}

export interface RenderValueProps {
  path: Path
  value: JSON
  readOnly: boolean
  enforceString: boolean | undefined
  selection: Selection | undefined
  searchResult: SearchResultItem | undefined
  isSelected: boolean
  isEditing: boolean
  normalization: ValueNormalization
  onPatch: TreeModeContext['onPatch']
  onPasteJson: (pastedJson: { path: Path; contents: JSON }) => void
  onSelect: (selection: Selection) => void
  onFind: (findAndReplace: boolean) => void
}

export interface RenderValueConstructor {
  // TODO: fix type definition
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  component: SvelteComponentConstructor
  props: unknown
}
