import { useQuery } from '@tanstack/react-query'
import { mangaService } from '@/services/manga-service'
import { queryKeys } from './query-keys'
import type { MangaQueryParams, Manga, PaginationMeta } from '@mangafire/shared/types'

export function useMangaList(params: MangaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.manga.list(params),
    queryFn: () => mangaService.getList(params),
    select: (res) => ({
      items: res.data ?? [],
      meta: res.meta,
    }),
  })
}

export type UseMangaListReturn = {
  items: Manga[]
  meta?: PaginationMeta
}
