// used by JSONNode during dragging
import type { JSONPath } from 'immutable-json-patch'

export const singleton: Singleton = {
  selecting: false,
  selectionAnchor: undefined, // Path
  selectionAnchorType: undefined, // Selection type
  selectionFocus: undefined, // Path

  dragging: false
}

interface Singleton {
  selecting: boolean
  selectionAnchor: JSONPath | undefined
  selectionAnchorType: string | undefined
  selectionFocus: JSONPath | undefined

  dragging: boolean
}
