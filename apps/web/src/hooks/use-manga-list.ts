import { useQuery } from '@tanstack/react-query'
import { mangaService, type MangaListItem } from '@/services/manga-service'
import { queryKeys } from './query-keys'
import type { MangaQueryParams, PaginationMeta } from '@mangafire/shared/types'

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
  items: MangaListItem[]
  meta?: PaginationMeta
}
