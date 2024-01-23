import JSONEditor from './components/JSONEditor.svelte'
import BooleanToggle from './plugins/value/components/BooleanToggle.svelte'
import ColorPicker from './plugins/value/components/ColorPicker.svelte'
import EditableValue from './plugins/value/components/EditableValue.svelte'
import EnumValue from './plugins/value/components/EnumValue.svelte'
import HiddenValue from './plugins/value/components/HiddenValue.svelte'
import ReadonlyValue from './plugins/value/components/ReadonlyValue.svelte'
import TimestampTag from './plugins/value/components/TimestampTag.svelte'

// editor
export { JSONEditor }
export * from './types.js'

// value plugins
export { renderValue } from './plugins/value/renderValue.js'
export { renderJSONSchemaEnum } from './plugins/value/renderJSONSchemaEnum.js'
export {
  BooleanToggle,
  ColorPicker,
  EditableValue,
  EnumValue,
  HiddenValue,
  ReadonlyValue,
  TimestampTag
}

// validator plugins
export * from './plugins/validator/createAjvValidator.js'

// query plugins
export { lodashQueryLanguage } from './plugins/query/lodashQueryLanguage.js'
export { javascriptQueryLanguage } from './plugins/query/javascriptQueryLanguage.js'
export { jmespathQueryLanguage } from './plugins/query/jmespathQueryLanguage.js'

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

// selection
export {
  isValueSelection,
  isKeySelection,
  isInsideSelection,
  isAfterSelection,
  isMultiSelection,
  isEditingSelection,
  createValueSelection,
  createKeySelection,
  createInsideSelection,
  createAfterSelection,
  createMultiSelection
} from './logic/selection.js'

// parser
export { isEqualParser } from './utils/jsonUtils.js'

// path
export { parseJSONPath, stringifyJSONPath } from './utils/pathUtils.js'

// actions
export { resizeObserver } from './actions/resizeObserver.js'
export { onEscape } from './actions/onEscape.js'

// typeguards
export * from './typeguards.js'
