import type { JSONPath } from 'immutable-json-patch'

export interface SortModalState {
  selectedPath: JSONPath | undefined
  selectedDirection: 1 | -1
}

export const sortModalStates: Record<string, SortModalState> = {}
