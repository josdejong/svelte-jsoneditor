import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'
import type { RenderValueConstructor, RenderValueProps } from '../../types'

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
  onSelect,
  onFind
}: RenderValueProps): RenderValueConstructor[] {
  const renderers = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle,
      props: { path, value, readOnly, onPatch, onSelect }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: ColorPicker,
      props: { path, value, readOnly, onPatch, onSelect }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableValue,
      props: { path, value, enforceString, normalization, onPatch, onPasteJson, onSelect, onFind }
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
