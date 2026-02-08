import { useQuery } from '@tanstack/react-query'
import { searchService } from '@/services/search-service'
import { queryKeys } from './query-keys'
import type { SearchParams } from '@mangafire/shared/types'

export function useSearchAutocomplete(query: string) {
  return useQuery({
    queryKey: queryKeys.search.autocomplete(query),
    queryFn: () => searchService.autocomplete(query),
    enabled: query.length >= 1,
    staleTime: 60_000,
    select: (res) => res.data ?? [],
  })
}

export function useSearchFull(params: SearchParams) {
  return useQuery({
    queryKey: queryKeys.search.full(params),
    queryFn: () => {
      // Convert SearchParams to Record<string, unknown> for API call
      const apiParams: Record<string, unknown> = {
        q: params.q,
        mode: 'full',
      }
      if (params.status) apiParams.status = params.status
      if (params.type) apiParams.type = params.type
      if (params.genreId) apiParams.genreId = params.genreId
      if (params.page) apiParams.page = params.page
      if (params.limit) apiParams.limit = params.limit
      return searchService.fullSearch(apiParams)
    },
    enabled: (params.q?.length ?? 0) >= 1,
    staleTime: 60_000,
    select: (res) => ({
      items: res.data ?? [],
      meta: res.meta,
    }),
  })
}
