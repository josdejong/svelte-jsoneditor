import EnumValue from './components/EnumValue.svelte'
import { getJSONSchemaOptions } from '$lib/utils/jsonSchemaUtils.js'
import type {
  JSONSchema,
  JSONSchemaDefinitions,
  RenderValueComponentDescription,
  RenderValueProps
} from '$lib/types'
import type { SvelteComponentTyped } from 'svelte'

/**
 * Search the JSON schema for enums defined at given props.path. If found,
 * return an EnumValue renderer. If not found, return null. In that case you
 * have to fallback on the default valueRender function
 */
export function renderJSONSchemaEnum(
  props: RenderValueProps,
  schema: JSONSchema,
  schemaDefinitions?: JSONSchemaDefinitions
): RenderValueComponentDescription[] {
  const enumValues = getJSONSchemaOptions(schema, schemaDefinitions, props.path)

  if (enumValues) {
    const { value, path, selection, parser, readOnly, onPatch } = props

    const options = enumValues.map((enumValue) => ({
      value: enumValue,
      text: enumValue
    }))

    // make sure the current value is also added as one of the options,
    // else it would look as if the first option is the current value
    const optionsWithValue = enumValues.includes(props.value)
      ? options
      : [{ value: value as unknown, text: value as unknown }].concat(options)

    return [
      {
        component: EnumValue as unknown as SvelteComponentTyped, // TODO: casting should not be needed
        props: {
          value,
          path,
          selection,
          parser,
          readOnly,
          onPatch,
          options: optionsWithValue
        }
      }
    ]
  }

  return null
}
