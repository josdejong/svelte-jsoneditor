import JSONEditor from './components/JSONEditor.svelte'
import BooleanToggle from './plugins/value/components/BooleanToggle.svelte'
import ColorPicker from './plugins/value/components/ColorPicker.svelte'
import EditableValue from './plugins/value/components/EditableValue.svelte'
import EnumValue from './plugins/value/components/EnumValue.svelte'
import ReadonlyValue from './plugins/value/components/ReadonlyValue.svelte'
import TimestampTag from './plugins/value/components/TimestampTag.svelte'

export { onEscape } from './actions/onEscape.js'
// actions
export { resizeObserver } from './actions/resizeObserver.js'
// expand
export { expandAll, expandMinimal, expandNone, expandSelf } from './logic/documentState'
// selection
export {
  createAfterSelection,
  createEditKeySelection,
  createEditValueSelection,
  createInsideSelection,
  createKeySelection,
  createMultiSelection,
  createValueSelection,
  getAnchorPath,
  getEndPath,
  getFocusPath,
  getSelectionPaths,
  getStartPath,
  isAfterSelection,
  isEditingSelection,
  isInsideSelection,
  isKeySelection,
  isMultiSelection,
  isValueSelection
} from './logic/selection.js'
export { javascriptQueryLanguage } from './plugins/query/javascriptQueryLanguage.js'
export { jmespathQueryLanguage } from './plugins/query/jmespathQueryLanguage.js'
export { jsonpathQueryLanguage } from './plugins/query/jsonpathQueryLanguage.js'

// query plugins
export { jsonQueryLanguage } from './plugins/query/jsonQueryLanguage.js'
export { lodashQueryLanguage } from './plugins/query/lodashQueryLanguage.js'
// validator plugins
export * from './plugins/validator/createAjvValidator.js'
// HTML
export { getValueClass } from './plugins/value/components/utils/getValueClass'
export { renderJSONSchemaEnum } from './plugins/value/renderJSONSchemaEnum.js'
// value plugins
export { renderValue } from './plugins/value/renderValue.js'
// typeguards
export * from './typeguards.js'
// types
export * from './types.js'
// content
// parser
export {
  estimateSerializedSize,
  isContent,
  isEqualParser,
  isJSONContent,
  isLargeContent,
  isTextContent,
  toJSONContent,
  toTextContent
} from './utils/jsonUtils.js'
export { keyComboFromEvent } from './utils/keyBindings'
// path
export { parseJSONPath, stringifyJSONPath } from './utils/pathUtils.js'

// type checking
export {
  isBoolean,
  isColor,
  isObject,
  isObjectOrArray,
  isTimestamp,
  isUrl,
  stringConvert,
  valueType
} from './utils/typeUtils'
// editor
export {
  BooleanToggle,
  ColorPicker,
  EditableValue,
  EnumValue,
  JSONEditor,
  ReadonlyValue,
  TimestampTag
}
