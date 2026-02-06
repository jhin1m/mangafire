import type { MangaQueryParams, ChapterQueryParams, PaginationParams } from '@mangafire/shared/types'

export const queryKeys = {
  manga: {
    all: ['manga'] as const,
    list: (params: MangaQueryParams) => ['manga', 'list', params] as const,
    detail: (slug: string) => ['manga', 'detail', slug] as const,
  },
  genres: {
    all: ['genres'] as const,
  },
  chapters: {
    list: (slug: string, params?: ChapterQueryParams) => ['chapters', slug, 'list', params] as const,
    detail: (slug: string, number: string) => ['chapters', slug, 'detail', number] as const,
  },
  volumes: {
    list: (slug: string, params?: PaginationParams) => ['volumes', slug, params] as const,
  },
}
