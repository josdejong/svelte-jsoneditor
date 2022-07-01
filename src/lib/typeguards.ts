import type { MenuSpaceItem } from './types.js'

export function isMenuSpaceItem(item: unknown): item is MenuSpaceItem {
  return item && item['space'] === true && Object.keys(item).length === 1
}
