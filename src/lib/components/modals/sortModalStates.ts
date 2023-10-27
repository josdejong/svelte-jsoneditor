import type { NumberOption, PathOption } from '$lib/types.js'

export interface SortModalState {
  selectedProperty: PathOption
  selectedDirection: NumberOption
}

export const sortModalStates: Record<string, SortModalState> = {}
