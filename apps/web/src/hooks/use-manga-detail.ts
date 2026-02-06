import { useQuery } from '@tanstack/react-query'
import { mangaService } from '@/services/manga-service'
import { queryKeys } from './query-keys'

export function useMangaDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.manga.detail(slug),
    queryFn: () => mangaService.getBySlug(slug),
    enabled: !!slug,
    select: (res) => res.data,
  })
}
