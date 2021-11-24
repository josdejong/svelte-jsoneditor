import { isUrl, valueType } from '../../../../../utils/typeUtils.js'
import classnames from 'classnames'
import { SELECTION_TYPE } from '../../../../../logic/selection.js'

export function getValueClass(value) {
  const type = valueType(value)

  return classnames(SELECTION_TYPE.VALUE, type, {
    url: isUrl(value),
    empty: typeof value === 'string' && value.length === 0
  })
}
