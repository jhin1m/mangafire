import type { Manga } from './manga'

export type SearchMode = 'autocomplete' | 'full'

export interface SearchParams {
  q: string
  mode?: SearchMode
  status?: string
  type?: string
  genreId?: number
  page?: number
  limit?: number
}

export interface SearchAutocompleteItem {
  id: number
  title: string
  slug: string
  coverImage: string | null
  status: string
  similarity: number
  latestChapter: string | null
}

export interface SearchFullItem extends Manga {
  genres: { id: number; name: string; slug: string }[]
  latestChapters: {
    number: string
    title: string | null
    language: string
    createdAt: Date
  }[]
}
