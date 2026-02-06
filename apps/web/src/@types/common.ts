import { ReactNode, CSSProperties } from 'react'

// Re-export shared types (source of truth: @mangafire/shared)
export type { Genre, GenreTrending, Poster, FilterDropdown, TableQueries } from '@mangafire/shared'
export { EnumFilter, ENUM_READ_BY } from '@mangafire/shared'

// FE-only types (React dependencies)
export interface CommonProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
}

export type CommonFilterProps = {
  data: import('@mangafire/shared').FilterDropdown[]
  value: import('@mangafire/shared').EnumFilter
  onToggle: () => void
  open: boolean
  dropdownClassName?: string
  type?: 'checkbox' | 'radio'
}
