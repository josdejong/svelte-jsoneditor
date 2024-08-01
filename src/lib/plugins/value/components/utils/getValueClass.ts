import { isUrl, valueType } from '$lib/utils/typeUtils.js'
import { type JSONParser, Mode } from '$lib/types.js'
import { classnames } from '$lib/utils/cssUtils.js'

export function getValueClass(value: unknown, mode: Mode, parser: JSONParser): string {
  const type = valueType(value, parser)

  return classnames('jse-value', 'jse-' + type, {
    'jse-url': isUrl(value),
    'jse-empty': typeof value === 'string' && value.length === 0,
    'jse-table-cell': mode === Mode.table
  })
}
