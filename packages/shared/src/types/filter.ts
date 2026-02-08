export enum EnumFilter {
  'type' = 'type',
  'genre' = 'genre',
  'status' = 'status',
  'language' = 'language',
  'year' = 'year',
  'length' = 'length',
  'sort' = 'sort',
}

// Tri-state for genre filter: null (unchecked), 'include', 'exclude'
export type GenreFilterState = 'include' | 'exclude' | null

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean // Keep for backward compat (non-genre filters)
  state?: GenreFilterState // Tri-state for genre filter
}

export type TableQueries = {
  total?: number
  pageIndex?: number
  pageSize?: number
  query?: string
  sort?: {
    order: 'asc' | 'desc' | ''
    key: string | number
  }
}
