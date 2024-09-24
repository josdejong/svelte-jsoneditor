import JSONEditor from './components/JSONEditor.svelte'
import BooleanToggle from './plugins/value/components/BooleanToggle.svelte'
import ColorPicker from './plugins/value/components/ColorPicker.svelte'
import EditableValue from './plugins/value/components/EditableValue.svelte'
import EnumValue from './plugins/value/components/EnumValue.svelte'
import ReadonlyValue from './plugins/value/components/ReadonlyValue.svelte'
import TimestampTag from './plugins/value/components/TimestampTag.svelte'

// editor
export { JSONEditor }

// value plugins
export { renderValue } from './plugins/value/renderValue.js'
export { renderJSONSchemaEnum } from './plugins/value/renderJSONSchemaEnum.js'
export { BooleanToggle, ColorPicker, EditableValue, EnumValue, ReadonlyValue, TimestampTag }

// HTML
export { getValueClass } from './plugins/value/components/utils/getValueClass'
export { keyComboFromEvent } from './utils/keyBindings'

// validator plugins
export * from './plugins/validator/createAjvValidator.js'

// query plugins
export { jsonQueryLanguage } from './plugins/query/jsonQueryLanguage.js'
export { jmespathQueryLanguage } from './plugins/query/jmespathQueryLanguage.js'
export { jsonpathQueryLanguage } from './plugins/query/jsonpathQueryLanguage.js'
export { lodashQueryLanguage } from './plugins/query/lodashQueryLanguage.js'
export { javascriptQueryLanguage } from './plugins/query/javascriptQueryLanguage.js'

// content
export {
  isContent,
  isTextContent,
  isJSONContent,
  isLargeContent,
  toTextContent,
  toJSONContent,
  estimateSerializedSize
} from './utils/jsonUtils.js'

// expand
export { expandAll, expandMinimal, expandNone, expandSelf } from './logic/documentState'

// selection
export {
  isValueSelection,
  isKeySelection,
  isInsideSelection,
  isAfterSelection,
  isMultiSelection,
  isEditingSelection,
  createValueSelection,
  createEditValueSelection,
  createKeySelection,
  createEditKeySelection,
  createInsideSelection,
  createAfterSelection,
  createMultiSelection,
  getFocusPath,
  getAnchorPath,
  getStartPath,
  getEndPath,
  getSelectionPaths
} from './logic/selection.js'

// parser
export { isEqualParser } from './utils/jsonUtils.js'

// path
export { parseJSONPath, stringifyJSONPath } from './utils/pathUtils.js'

// actions
export { resizeObserver } from './actions/resizeObserver.js'
export { onEscape } from './actions/onEscape.js'

// type checking
export {
  valueType,
  stringConvert,
  isObject,
  isObjectOrArray,
  isBoolean,
  isTimestamp,
  isColor,
  isUrl
} from './utils/typeUtils'

// types
export * from './types.js'

// typeguards
export * from './typeguards.js'
