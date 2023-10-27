import type { QueryLanguageOptions } from '$lib/types.js'

export interface TransformModalState {
  queryLanguageId: string
  queryOptions: QueryLanguageOptions
  query: string
  isManual: boolean
}

export const transformModalStates: Record<string, TransformModalState> = {}

export interface TransformModalStateShared {
  showWizard: boolean
  showOriginal: boolean
}

export const transformModalStateShared: TransformModalStateShared = {
  showWizard: true,
  showOriginal: true
}
