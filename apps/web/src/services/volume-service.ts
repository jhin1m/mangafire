import { apiClient } from './api-client'
import type { Volume, PaginationParams, ApiResponse } from '@mangafire/shared/types'

export const volumeService = {
  getList(mangaSlug: string, params: PaginationParams = {}): Promise<ApiResponse<Volume[]>> {
    return apiClient.get<Volume[]>(`/api/manga/${mangaSlug}/volumes`, params as Record<string, unknown>)
  },
}
