/** JSDoc type definitions */

/**
 * @typedef {{} | [] | string | number | boolean | null} JSON
 */

/**
 * @typedef {{
 *   json: JSON?,
 *   text: string?
 * }} Content
 */

/**
 * @typedef {{
 *   name: string?,
 *   history: boolean?,
 *   indentation: number | string?,
 *   onChange: function (patch: JSONPatchDocument, revert: JSONPatchDocument)?,
 *   onChangeText: function ()?,
 *   onChangeMode: function (mode: string, prevMode: string)?,
 *   onError:  function (err: Error)?,
 *   isPropertyEditable: function (Path)?
 *   isValueEditable: function (Path)?,
 *   escapeUnicode: boolean?,
 *   expand: function(path: Path) : boolean?,
 *   ajv: Object?
 * }} Options
 */

/**
 * @typedef {Array<string | number | Symbol>} Path
 */

/**
 * @typedef {'after' | 'key' | 'value' | 'append'} CaretType
 */

/**
 * @typedef {{
 *   start: number,
 *   end: number
 * }} VisibleSection
 */

/**
 * @typedef {{
 *   path: Path,
 *   type: CaretType
 * }} CaretPosition
 */

/**
 * @typedef {{
 *   op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test',
 *   path: string,
 *   from?: string,
 *   value?: *
 * }} JSONPatchOperation
 */

/**
 * @typedef {{
 *   op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test',
 *   path: Path,
 *   from?: Path,
 *   value?: *
 * }} PreprocessedJSONPatchOperation
 */

/**
 * @typedef {JSONPatchOperation[]} JSONPatchDocument
 */

/**
 * @typedef {{
 *   patch: JSONPatchDocument,
 *   revert: JSONPatchDocument,
 *   error: Error | null
 * }} JSONPatchResult
 */

/**
 * @typedef {{
 *   before?: function (json: JSON, operation: PreprocessedJSONPatchOperation) : { json?: JSON, operation?: PreprocessedJSONPatchOperation } | undefined,
 *   after?: function (json: JSON, operation: PreprocessedJSONPatchOperation, previousJson: JSON) : JSON
 * }} JSONPatchOptions
 */

/**
 * @typedef {{
 *   type: 'multi',
 *   paths: Path[],
 *   anchorPath: Path,
 *   focusPath: Path,
 *   pathsMap: Object<string, boolean>
 * }} MultiSelection
 */

/**
 * @typedef {{type: 'after', path: Path, anchorPath: Path, focusPath: Path}} AfterSelection
 */

/**
 * @typedef {{type: 'inside', path: Path, anchorPath: Path, focusPath: Path}} InsideSelection
 */

/**
 * @typedef {{type: 'key', path: Path, anchorPath: Path, focusPath: Path, edit?: boolean}} KeySelection
 */

/**
 * @typedef {{type: 'value', path: Path, anchorPath: Path, focusPath: Path, edit?: boolean}} ValueSelection
 */

/**
 * @typedef {MultiSelection | AfterSelection | InsideSelection | KeySelection | ValueSelection} Selection
 */

/**
 * @typedef {{type: 'after', path: Path}} AfterSelectionSchema
 */

/**
 * @typedef {{type: 'inside', path: Path}} InsideSelectionSchema
 */

/**
 * @typedef {{type: 'key', path: Path, edit?: boolean, next?: boolean}} KeySelectionSchema
 */

/**
 * @typedef {{type: 'value', path: Path, edit?: boolean, next?: boolean, nextInside?: boolean}} ValueSelectionSchema
 */

/**
 * @typedef {{type: 'multi', anchorPath: Path, focusPath: Path}} MultiSelectionSchema
 */

/**
 * @typedef {MultiSelectionSchema  | AfterSelectionSchema | InsideSelectionSchema | KeySelectionSchema | ValueSelectionSchema} SelectionSchema
 */

/**
 * @typedef {Array.<{key: string, value: *}>} ClipboardValues
 */

/**
 * @typedef {{
 *   prefix: string,
 *   iconName: string,
 *   icon: Array
 * }} FontAwesomeIcon
 */

/**
 * @typedef {Object} MenuButtonItem
 * @property {function} onClick
 * @property {FontAwesomeIcon} [icon]
 * @property {string} [text=undefined]
 * @property {string} [title=undefined]
 * @property {string} [className=undefined]
 * @property {boolean} [disabled=false]
 */

/**
 * @typedef {Object} MenuSeparatorItem
 * @property {true} separator
 */

/**
 * @typedef {Object} MenuSpaceItem
 * @property {true} space
 */

/**
 * @typedef {MenuButtonItem | MenuSeparatorItem | MenuSpaceItem} MenuItem
 */

/**
  * @typedef {{path: Path, message: string, isChildError?: boolean}} ValidationError
  */

/**
 * @typedef {{start: number, end: number}} Section
 *  Start included, end excluded
 */
