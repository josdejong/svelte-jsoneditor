import { isUrl, valueType } from '../../../../utils/typeUtils.js'
import classnames from 'classnames'

export function getValueClass(value) {
  const type = valueType(value)

  return classnames('jse-value', 'jse-' + type, {
    'jse-url': isUrl(value),
    'jse-empty': typeof value === 'string' && value.length === 0
  })
}
