import EnumValue from './components/EnumValue.svelte'
import { getJSONSchemaOptions } from '../../utils/jsonSchemaUtils.js'

/**
 * Search the JSON schema for enums defined at given props.path. If found,
 * return an EnumValue renderer. If not found, return null. In that case you
 * have to fallback on the default valueRender function
 * @param {RenderValueProps} props
 * @param {JSON} schema
 * @param {JSON} schemaRefs
 * @return {RenderValueConstructor[]}
 */
export function renderJSONSchemaEnum(props, schema, schemaRefs) {
  const enumValues = getJSONSchemaOptions(schema, schemaRefs, props.path)

  if (enumValues) {
    const { value, path, readOnly, onPatch, onSelect, isSelected } = props

    const options = enumValues.map((value) => ({
      value,
      text: value
    }))

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
          options
        }
      }
    ]
  }

  return null
}
