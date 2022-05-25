import EnumValue from './components/EnumValue.svelte'
import { getJSONSchemaOptions } from '../../utils/jsonSchemaUtils.js'
import type { JSONData, RenderValueComponentDescription, RenderValueProps } from '../../types'
import type { SvelteComponent } from 'svelte'

/**
 * Search the JSON schema for enums defined at given props.path. If found,
 * return an EnumValue renderer. If not found, return null. In that case you
 * have to fallback on the default valueRender function
 */
export function renderJSONSchemaEnum(
  props: RenderValueProps,
  schema: JSONData,
  schemaDefinitions: JSONData
): RenderValueComponentDescription[] {
  const enumValues = getJSONSchemaOptions(schema, schemaDefinitions, props.path)

  if (enumValues) {
    const { value, path, readOnly, onPatch, onSelect, isSelected } = props

    const options = enumValues.map((enumValue) => ({
      value: enumValue,
      text: enumValue
    }))

    // make sure the current value is also added as one of the options,
    // else it would look as if the first option is the current value
    const optionsWithValue = enumValues.includes(props.value)
      ? options
      : [{ value, text: value }].concat(options)

    return [
      {
        component: EnumValue as unknown as SvelteComponent, // TODO: casting should not be needed
        props: {
          value,
          path,
          readOnly,
          onPatch,
          onSelect,
          isSelected,
          options: optionsWithValue
        }
      }
    ]
  }

  return null
}
