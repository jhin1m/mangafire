import { apiClient } from './api-client'
import type { Manga, MangaQueryParams, ApiResponse } from '@mangafire/shared/types'

// Backend list response: manga enriched with genres + latest 3 chapters
export interface MangaListItem extends Manga {
  genres: { id: number; name: string; slug: string }[]
  latestChapters: {
    number: string
    title: string | null
    language: string
    createdAt: string
  }[]
}

// Backend detail response: manga with full genre list
export interface MangaWithGenres extends Manga {
  genres: { id: number; name: string; slug: string }[]
}

export const mangaService = {
  getList(params: MangaQueryParams = {}): Promise<ApiResponse<MangaListItem[]>> {
    return apiClient.get<MangaListItem[]>('/api/manga', params as Record<string, unknown>)
  },

  getBySlug(slug: string): Promise<ApiResponse<MangaWithGenres>> {
    return apiClient.get<MangaWithGenres>(`/api/manga/${slug}`)
  },
}
