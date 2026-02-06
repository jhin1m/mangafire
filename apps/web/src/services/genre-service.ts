import { apiClient } from './api-client'
import type { ApiResponse } from '@mangafire/shared/types'

// Backend genre entity includes additional fields beyond frontend Genre type
export interface GenreEntity {
  id: number
  name: string
  slug: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export const genreService = {
  getAll(): Promise<ApiResponse<GenreEntity[]>> {
    return apiClient.get<GenreEntity[]>('/api/genres')
  },
}
