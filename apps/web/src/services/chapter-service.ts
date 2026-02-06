import { apiClient } from './api-client'
import type { Chapter, ChapterWithPages, ChapterQueryParams, ApiResponse, Language } from '@mangafire/shared/types'

export const chapterService = {
  getList(mangaSlug: string, params: ChapterQueryParams = {}): Promise<ApiResponse<Chapter[]>> {
    return apiClient.get<Chapter[]>(`/api/manga/${mangaSlug}/chapters`, params as Record<string, unknown>)
  },

  getByNumber(mangaSlug: string, number: string, language?: Language): Promise<ApiResponse<ChapterWithPages>> {
    const params = language ? { language } : undefined
    return apiClient.get<ChapterWithPages>(`/api/manga/${mangaSlug}/chapters/${number}`, params)
  },
}
