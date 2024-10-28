import { isBoolean, isColor, isTimestamp } from '$lib/utils/typeUtils.js'
import type { RenderValueComponentDescription, RenderValueProps } from '$lib/types'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'

export function renderValue(props: RenderValueProps): RenderValueComponentDescription[] {
  const renderers: RenderValueComponentDescription[] = []

  if (!props.isEditing && isBoolean(props.value)) {
    renderers.push({ component: BooleanToggle, props })
  }

  if (!props.isEditing && isColor(props.value)) {
    renderers.push({ component: ColorPicker, props })
  }

  if (props.isEditing) {
    renderers.push({ component: EditableValue, props })
  }

  if (!props.isEditing) {
    renderers.push({ component: ReadonlyValue, props })
  }

  if (!props.isEditing && isTimestamp(props.value)) {
    renderers.push({ component: TimestampTag, props })
  }

  return renderers
}
