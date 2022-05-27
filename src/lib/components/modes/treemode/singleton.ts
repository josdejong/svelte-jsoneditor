// used by JSONNode during dragging
import type { Path } from '$lib/types'

export const singleton: Singleton = {
  selecting: false,
  selectionAnchor: null, // Path
  selectionAnchorType: null, // Selection type
  selectionFocus: null, // Path

  dragging: false
}

interface Singleton {
  selecting: boolean
  selectionAnchor: Path | null
  selectionAnchorType: string | null
  selectionFocus: Path | null
  dragging: boolean
}
