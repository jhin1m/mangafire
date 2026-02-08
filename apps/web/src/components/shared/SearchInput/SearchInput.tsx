import { FiSearch, FiX } from 'react-icons/fi'

interface SearchInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onClear: () => void
  isLoading?: boolean
  placeholder?: string
  inputProps?: Record<string, unknown>
}

export const SearchInput = ({
  value,
  onChange,
  onFocus,
  onClear,
  isLoading = false,
  placeholder = 'Search manga...',
  inputProps = {}
}: SearchInputProps) => {
  return (
    <div className="search-input-wrapper">
      <FiSearch className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        maxLength={200}
        placeholder={placeholder}
        aria-label="Search manga"
        {...inputProps}
      />
      {isLoading && <div className="search-spinner" />}
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="search-clear-btn"
          aria-label="Clear search"
        >
          <FiX />
        </button>
      )}
    </div>
  )
}
