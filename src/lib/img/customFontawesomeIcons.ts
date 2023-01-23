import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import type { IconName } from '@fortawesome/fontawesome-common-types'

export const faJSONEditorExpand: IconDefinition = {
  prefix: 'fas',
  iconName: 'jsoneditor-expand' as IconName,
  icon: [
    512,
    512,
    [],
    '',
    'M 0,448 V 512 h 512 v -64 z ' +
      'M 0,0 V 64 H 512 V 0 Z ' +
      'M 256,96 128,224 h 256 z ' +
      'M 256,416 384,288 H 128 Z'
  ]
}

export const faJSONEditorCollapse: IconDefinition = {
  prefix: 'fas',
  iconName: 'jsoneditor-collapse' as IconName,
  icon: [
    512,
    512,
    [],
    '',
    'm 0,224 v 64 h 512 v -64 z ' + 'M 256,192 384,64 H 128 Z ' + 'M 256,320 128,448 h 256 z'
  ]
}

export const faJSONEditorFormat: IconDefinition = {
  prefix: 'fas',
  iconName: 'jsoneditor-format' as IconName,
  icon: [
    512,
    512,
    [],
    '',
    'M 0,32 v 64 h 416 v -64 z ' +
      'M 160,160 v 64 h 352 v -64 z ' +
      'M 160,288 v 64 h 288 v -64 z ' +
      'M 0,416 v 64 h 320 v -64 z'
  ]
}

export const faJSONEditorCompact: IconDefinition = {
  prefix: 'fas',
  iconName: 'jsoneditor-compact' as IconName,
  icon: [
    512,
    512,
    [],
    '',
    'M 0,32 v 64 h 512 v -64 z ' + 'M 0,160 v 64 h 512 v -64 z ' + 'M 0,288 v 64 h 352 v -64 z'
  ]
}
