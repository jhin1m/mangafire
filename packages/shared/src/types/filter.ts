export enum EnumFilter {
  'type' = 'type',
  'genre' = 'genre',
  'status' = 'status',
  'language' = 'language',
  'year' = 'year',
  'length' = 'length',
  'sort' = 'sort',
}

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean
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
