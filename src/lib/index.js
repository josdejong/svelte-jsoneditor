import _JSONEditor from './components/JSONEditor.svelte'
import _SortModal from './components/modals/SortModal.svelte'
import _TransformModal from './components/modals/TransformModal.svelte'

export const JSONEditor = _JSONEditor

// plugins
export { createAjvValidator } from './plugins/createAjvValidator.js'
export { lodashQueryLanguage } from './plugins/query/lodashQueryLanguage.js'
export { jmespathQueryLanguage } from './plugins/query/jmespathQueryLanguage.js'

// utils
export const SortModal = _SortModal
export const TransformModal = _TransformModal
export { parseJSONPointerWithArrayIndices } from './utils/jsonPointer.js'
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
