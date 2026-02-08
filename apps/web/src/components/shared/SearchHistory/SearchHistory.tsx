import { FiClock, FiX } from 'react-icons/fi'

interface SearchHistoryProps {
  items: string[]
  onSelect: (query: string) => void
  onRemove: (query: string) => void
  onClear: () => void
}

export const SearchHistory = ({
  items,
  onSelect,
  onRemove,
  onClear
}: SearchHistoryProps) => {
  if (items.length === 0) return null

  return (
    // onMouseDown preventDefault stops input blur → keeps Downshift menu open
    // so click handlers on history items can fire
    <div className="search-history" onMouseDown={(e) => e.preventDefault()}>
      <div className="search-history-header">
        <span>Recent Searches</span>
        <button type="button" onClick={onClear} aria-label="Clear all history">
          Clear
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="search-history-item">
          <FiClock className="history-icon" />
          <div
            className="history-text"
            onClick={() => onSelect(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(item)
              }
            }}
          >
            {item}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="history-remove"
            aria-label={`Remove ${item} from history`}
          >
            <FiX />
          </button>
        </div>
      ))}
    </div>
  )
}
