import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils.js'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'

/**
 * @param {RenderValueProps} props
 * @return {RenderValueConstructor[]}
 */
export function renderValue({
  path,
  value,
  readOnly,
  enforceString,
  searchResult,
  isEditing,
  normalization,
  onPatch,
  onPasteJson,
  onSelect
}) {
  const renderers = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle,
      props: { path, value, readOnly, onPatch }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: ColorPicker,
      props: { path, value, readOnly, onPatch }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableValue,
      props: { path, value, enforceString, normalization, onPatch, onPasteJson, onSelect }
    })
  }

  if (!isEditing) {
    renderers.push({
      component: ReadonlyValue,
      props: { path, value, readOnly, normalization, searchResult, onSelect }
    })
  }

  if (!isEditing && isTimestamp(value)) {
    renderers.push({
      component: TimestampTag,
      props: { value }
    })
  }

  return renderers
}
