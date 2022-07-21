import { isBoolean, isColor, isTimestamp } from '../../utils/typeUtils.js'
import BooleanToggle from './components/BooleanToggle.svelte'
import ColorPicker from './components/ColorPicker.svelte'
import EditableValue from './components/EditableValue.svelte'
import ReadonlyValue from './components/ReadonlyValue.svelte'
import TimestampTag from './components/TimestampTag.svelte'
import type { RenderValueComponentDescription, RenderValueProps } from '../../types'
import type { SvelteComponentTyped } from 'svelte'

export function renderValue({
  path,
  value,
  readOnly,
  enforceString,
  searchResultItems,
  isEditing,
  normalization,
  onPatch,
  onPasteJson,
  onSelect,
  onFind,
  focus
}: RenderValueProps): RenderValueComponentDescription[] {
  const renderers: RenderValueComponentDescription[] = []

  if (!isEditing && isBoolean(value)) {
    renderers.push({
      component: BooleanToggle as unknown as SvelteComponentTyped, // TODO: casting should not be needed
      props: { path, value, readOnly, onPatch, focus }
    })
  }

  if (!isEditing && isColor(value)) {
    renderers.push({
      component: ColorPicker as unknown as SvelteComponentTyped, // TODO: casting should not be needed
      props: { path, value, readOnly, onPatch, focus }
    })
  }

  if (isEditing) {
    renderers.push({
      component: EditableValue as unknown as SvelteComponentTyped, // TODO: casting should not be needed
      props: {
        path,
        value,
        enforceString,
        normalization,
        onPatch,
        onPasteJson,
        onSelect,
        onFind,
        focus
      }
    })
  }

  if (!isEditing) {
    renderers.push({
      component: ReadonlyValue as unknown as SvelteComponentTyped, // TODO: casting should not be needed
      props: { path, value, readOnly, normalization, searchResultItems, onSelect }
    })
  }

  if (!isEditing && isTimestamp(value)) {
    renderers.push({
      component: TimestampTag as unknown as SvelteComponentTyped, // TODO: casting should not be needed
      props: { value }
    })
  }

  return renderers
}
