import { isUrl, valueType } from '../../../../utils/typeUtils'
import classnames from 'classnames'

export function getValueClass(value: unknown): string {
  const type = valueType(value)

  return classnames('jse-value', 'jse-' + type, {
    'jse-url': isUrl(value),
    'jse-empty': typeof value === 'string' && value.length === 0
  })
}
