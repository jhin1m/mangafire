import { useQuery } from '@tanstack/react-query'
import { genreService, type GenreEntity } from '@/services/genre-service'
import { queryKeys } from './query-keys'

export function useGenres() {
  return useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: () => genreService.getAll(),
    staleTime: 30 * 60 * 1000, // genres rarely change (30 min)
    select: (res) => res.data ?? [],
  })
}

export type { GenreEntity }
