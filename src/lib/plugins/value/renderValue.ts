import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils.js'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'
import type { RenderValueComponentDescription, RenderValueProps } from '../../types'
import type { SvelteComponent } from 'svelte'

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
}: RenderValueProps): RenderValueComponentDescription[] {
  const renderers: RenderValueComponentDescription[] = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle as unknown as SvelteComponent, // TODO: casting should not be needed
      props: { path, value, readOnly, onPatch, onSelect }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: ColorPicker as unknown as SvelteComponent, // TODO: casting should not be needed
      props: { path, value, readOnly, onPatch, onSelect }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableValue as unknown as SvelteComponent, // TODO: casting should not be needed
      props: { path, value, enforceString, normalization, onPatch, onPasteJson, onSelect, onFind }
    })
  }

  if (!isEditing) {
    renderers.push({
      component: ReadonlyValue as unknown as SvelteComponent, // TODO: casting should not be needed
      props: { path, value, readOnly, normalization, searchResult, onSelect }
    })
  }

  if (!isEditing && isTimestamp(value)) {
    renderers.push({
      component: TimestampTag as unknown as SvelteComponent, // TODO: casting should not be needed
      props: { value }
    })
  }

  return renderers
}
