import { SELECTION_TYPE } from '../../logic/selection.js'
import { isEqual } from 'lodash-es'
import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils.js'
import BooleanToggle from './components/BooleanToggle.svelte'
import Color from './components/Color.svelte'
import EditableDiv from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import Timestamp from './components/Timestamp.svelte'

/**
 * @param {RenderValueProps} props
 * @return {RenderValueConstructor[]}
 */
export function renderValue({
  path,
  value,
  readOnly,
  selection,
  searchResult,
  onPatch,
  onPasteJson,
  onSelect
}) {
  const isSelected =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false
  const isEditing = !readOnly && isSelected && selection && selection.edit === true

  const renderers = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle,
      props: { path, value, readOnly, onPatch }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: Color,
      props: { path, value, readOnly, onPatch }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableDiv,
      props: { path, value, onPatch, onPasteJson, onSelect }
    })
  }

  if (!isEditing) {
    renderers.push({
      component: ReadonlyValue,
      props: { path, value, readOnly, searchResult, onSelect }
    })
  }

  if (!isEditing && isTimestamp(value)) {
    renderers.push({
      component: Timestamp,
      props: { value }
    })
  }

  return renderers
}
