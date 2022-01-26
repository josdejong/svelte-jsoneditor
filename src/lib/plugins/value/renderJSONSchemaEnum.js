import EnumValue from './components/EnumValue.svelte'
import { getJSONSchemaOptions } from '../../utils/jsonSchemaUtils.js'

/**
 * Search the JSON schema for enums defined at given props.path. If found,
 * return an EnumValue renderer. If not found, return null. In that case you
 * have to fallback on the default valueRender function
 * @param {RenderValueProps} props
 * @param {JSON} schema
 * @param {JSON} schemaDefinitions
 * @return {RenderValueConstructor[]}
 */
export function renderJSONSchemaEnum(props, schema, schemaDefinitions) {
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
        component: EnumValue,
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
