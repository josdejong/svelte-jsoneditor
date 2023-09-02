import type { QueryLanguageOptions } from '$lib/types.js'

export interface ModalState {
  queryLanguageId: string
  queryOptions: QueryLanguageOptions
  query: string
  isManual: boolean
}

export const transformModalState: Record<string, ModalState> = {}
