import { useQuery } from '@tanstack/react-query'
import { chapterService } from '@/services/chapter-service'
import { queryKeys } from './query-keys'
import type { ChapterQueryParams, Chapter, ChapterWithPages, PaginationMeta, Language } from '@mangafire/shared/types'

export function useChapterList(mangaSlug: string, params: ChapterQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.chapters.list(mangaSlug, params),
    queryFn: () => chapterService.getList(mangaSlug, params),
    enabled: !!mangaSlug,
    select: (res) => ({
      items: res.data ?? [],
      meta: res.meta,
    }),
  })
}

export function useChapterDetail(mangaSlug: string, number: string, language?: Language) {
  return useQuery({
    queryKey: queryKeys.chapters.detail(mangaSlug, number),
    queryFn: () => chapterService.getByNumber(mangaSlug, number, language),
    enabled: !!mangaSlug && !!number,
    select: (res) => res.data,
  })
}

export type UseChapterListReturn = {
  items: Chapter[]
  meta?: PaginationMeta
}

export type UseChapterDetailReturn = ChapterWithPages | undefined
