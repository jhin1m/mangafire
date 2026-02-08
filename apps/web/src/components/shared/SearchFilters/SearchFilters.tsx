import { FiX } from 'react-icons/fi'

interface SearchFilter {
  id: string
  label: string
  type: 'status' | 'type' | 'genre'
}

interface SearchFiltersProps {
  filters: SearchFilter[]
  onRemove: (id: string) => void
  onClear: () => void
}

export const SearchFilters = ({
  filters,
  onRemove,
  onClear
}: SearchFiltersProps) => {
  if (filters.length === 0) return null

  return (
    <div className="search-filters-chips">
      {filters.map((filter) => (
        <span key={filter.id} className="search-filter-chip">
          {filter.label}
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            aria-label={`Remove ${filter.label} filter`}
          >
            <FiX />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="search-filters-clear"
        aria-label="Clear all filters"
      >
        Clear all
      </button>
    </div>
  )
}
