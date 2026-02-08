import { apiClient } from './api-client'
import type { SearchAutocompleteItem, SearchFullItem, ApiResponse, PaginationMeta } from '@mangafire/shared/types'

export interface SearchFullResponse {
  data: SearchFullItem[]
  meta?: PaginationMeta
}

export const searchService = {
  autocomplete(q: string): Promise<ApiResponse<SearchAutocompleteItem[]>> {
    return apiClient.get<SearchAutocompleteItem[]>('/api/search', { q, mode: 'autocomplete' })
  },

  fullSearch(params: Record<string, unknown>): Promise<ApiResponse<SearchFullItem[]>> {
    return apiClient.get<SearchFullItem[]>('/api/search', { ...params, mode: 'full' })
  },
}
