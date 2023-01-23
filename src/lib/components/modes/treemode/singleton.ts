// used by JSONNode during dragging
import type { JSONPath } from 'immutable-json-patch'

export const singleton: Singleton = {
  selecting: false,
  selectionAnchor: null, // Path
  selectionAnchorType: null, // Selection type
  selectionFocus: null, // Path

  dragging: false
}

interface Singleton {
  selecting: boolean
  selectionAnchor: JSONPath | null
  selectionAnchorType: string | null
  selectionFocus: JSONPath | null

  dragging: boolean
}
