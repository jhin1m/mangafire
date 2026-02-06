import { useQuery } from '@tanstack/react-query'
import { volumeService } from '@/services/volume-service'
import { queryKeys } from './query-keys'
import type { Volume, PaginationParams, PaginationMeta } from '@mangafire/shared/types'

export function useVolumeList(mangaSlug: string, params: PaginationParams = {}) {
  return useQuery({
    queryKey: queryKeys.volumes.list(mangaSlug, params),
    queryFn: () => volumeService.getList(mangaSlug, params),
    enabled: !!mangaSlug,
    select: (res) => ({
      items: res.data ?? [],
      meta: res.meta,
    }),
  })
}

export type UseVolumeListReturn = {
  items: Volume[]
  meta?: PaginationMeta
}
