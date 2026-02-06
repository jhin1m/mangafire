import { apiClient } from './api-client'
import type { Manga, MangaQueryParams, ApiResponse } from '@mangafire/shared/types'

// Backend returns manga with associated genres
export interface MangaWithGenres extends Manga {
  genres: { id: number; name: string; slug: string }[]
}

export const mangaService = {
  getList(params: MangaQueryParams = {}): Promise<ApiResponse<Manga[]>> {
    return apiClient.get<Manga[]>('/api/manga', params as Record<string, unknown>)
  },

  getBySlug(slug: string): Promise<ApiResponse<MangaWithGenres>> {
    return apiClient.get<MangaWithGenres>(`/api/manga/${slug}`)
  },
}
