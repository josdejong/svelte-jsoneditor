import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils.js'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'
import type { RenderValueComponentDescription, RenderValueProps } from '../../types'

export function renderValue({
  path,
  value,
  readOnly,
  enforceString,
  searchResultItems,
  isEditing,
  parser,
  normalization,
  onPatch,
  onPasteJson,
  onSelect,
  onFind,
  findNextInside,
  focus
}: RenderValueProps): RenderValueComponentDescription[] {
  const renderers: RenderValueComponentDescription[] = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle,
      props: { path, value, readOnly, onPatch, focus }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: ColorPicker,
      props: { path, value, readOnly, onPatch, focus }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableValue,
      props: {
        path,
        value,
        enforceString,
        parser,
        normalization,
        onPatch,
        onPasteJson,
        onSelect,
        onFind,
        findNextInside,
        focus
      }
    })
  }

  if (!isEditing) {
    renderers.push({
      component: ReadonlyValue,
      props: { path, value, readOnly, parser, normalization, searchResultItems, onSelect }
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
