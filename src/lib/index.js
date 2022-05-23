import _JSONEditor from './components/JSONEditor.svelte'
import _SortModal from './components/modals/SortModal.svelte'
import _TransformModal from './components/modals/TransformModal.svelte'
import _BooleanToggle from './plugins/value/components/BooleanToggle.svelte'
import _ColorPicker from './plugins/value/components/ColorPicker.svelte'
import _EditableValue from './plugins/value/components/EditableValue.svelte'
import _EnumValue from './plugins/value/components/EnumValue.svelte'
import _ReadonlyValue from './plugins/value/components/ReadonlyValue.svelte'
import _TimestampTag from './plugins/value/components/TimestampTag.svelte'

export const JSONEditor = _JSONEditor

// value plugins
export { renderValue } from './plugins/value/renderValue.js'
export { renderJSONSchemaEnum } from './plugins/value/renderJSONSchemaEnum.js'
export const BooleanToggle = _BooleanToggle
export const ColorPicker = _ColorPicker
export const EditableValue = _EditableValue
export const EnumValue = _EnumValue
export const ReadonlyValue = _ReadonlyValue
export const TimestampTag = _TimestampTag

// validator plugins
export { createAjvValidator } from './plugins/validator/createAjvValidator.js'

// query plugins
export { lodashQueryLanguage } from './plugins/query/lodashQueryLanguage.js'
export { javascriptQueryLanguage } from './plugins/query/javascriptQueryLanguage.js'
export { jmespathQueryLanguage } from './plugins/query/jmespathQueryLanguage.js'

// utils
export const SortModal = _SortModal
export const TransformModal = _TransformModal
export { getJSONSchemaOptions, findSchema, findEnum } from './utils/jsonSchemaUtils.js'
export { parseJSONPointerWithArrayIndices } from './utils/jsonPointer.js'
export { isTextContent, isLargeContent, estimateSerializedSize } from './utils/jsonUtils'
export {
  parseJSONPointer,
  compileJSONPointer,
  getIn,
  setIn,
  updateIn,
  insertAt,
  existsIn,
  deleteIn
} from 'immutable-json-patch'
export { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
