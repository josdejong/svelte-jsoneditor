import { isUrl, valueType } from '../../../../utils/typeUtils.js'
import classnames from 'classnames'
import type { JSONParser } from '$lib'

export function getValueClass(value: unknown, parser: JSONParser): string {
  const type = valueType(value, parser)

  return classnames('jse-value', 'jse-' + type, {
    'jse-url': isUrl(value),
    'jse-empty': typeof value === 'string' && value.length === 0
  })
}
