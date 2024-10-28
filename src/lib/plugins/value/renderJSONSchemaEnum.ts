import EnumValue from './components/EnumValue.svelte'
import { getJSONSchemaOptions } from '$lib/utils/jsonSchemaUtils.js'
import type {
  JSONSchema,
  JSONSchemaDefinitions,
  RenderValueComponentDescription,
  RenderValueProps
} from '$lib/types'

/**
 * Search the JSON schema for enums defined at given props.path. If found,
 * return an EnumValue renderer. If not found, return null. In that case you
 * have to fallback on the default valueRender function
 */
export function renderJSONSchemaEnum(
  props: RenderValueProps,
  schema: JSONSchema,
  schemaDefinitions?: JSONSchemaDefinitions
): RenderValueComponentDescription[] | undefined {
  const enumValues = getJSONSchemaOptions(schema, schemaDefinitions, props.path)

  if (enumValues) {
    const options = enumValues.map((enumValue) => ({
      value: enumValue,
      text: enumValue
    }))

    // make sure the current value is also added as one of the options,
    // else it would look as if the first option is the current value
    const optionsWithValue = enumValues.includes(props.value)
      ? options
      : [{ value: props.value, text: props.value }].concat(options)

    return [
      {
        component: EnumValue,
        props: {
          ...props,
          options: optionsWithValue
        }
      }
    ]
  }

  return undefined
}
