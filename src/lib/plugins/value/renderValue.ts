import { isBoolean, isColor, isTimestamp } from '$lib/utils/typeUtils.js'
import type { RenderValueComponentDescription, RenderValueProps } from '$lib/types'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'

export function renderValue({
  path,
  value,
  mode,
  readOnly,
  selection,
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
        selection,
        mode,
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
      props: { path, value, mode, readOnly, parser, normalization, searchResultItems, onSelect }
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
