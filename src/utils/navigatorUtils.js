export const IS_MAC = (typeof navigator !== 'undefined')
  ? navigator.platform.toUpperCase().indexOf('MAC') >= 0
  : false
