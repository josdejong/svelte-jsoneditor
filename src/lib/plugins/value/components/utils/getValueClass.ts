import { isUrl, valueType } from '../../../../utils/typeUtils'
import type { JSONParser } from '../../../../types'
import { classnames } from '../../../../utils/cssUtils'

export function getValueClass(value: unknown, parser: JSONParser): string {
  const type = valueType(value, parser)

  return classnames('jse-value', 'jse-' + type, {
    'jse-url': isUrl(value),
    'jse-empty': typeof value === 'string' && value.length === 0
  })
}
