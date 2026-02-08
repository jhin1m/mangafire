import { FiArrowRight } from 'react-icons/fi'

interface SearchAutocompleteItem {
  id: number
  title: string
  slug: string
  coverImage: string | null
  status: string
  similarity: number
  latestChapter: string | null
}

interface SearchAutocompleteProps {
  items: SearchAutocompleteItem[]
  isOpen: boolean
  highlightedIndex: number
  getItemProps: (options: {
    item: SearchAutocompleteItem
    index: number
  }) => Record<string, unknown>
  inputValue: string
  getMenuProps: () => Record<string, unknown>
  onViewAll?: () => void
}

// Escape special regex characters to prevent crash on input like "((("
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Helper to highlight matched text in title
const highlightMatch = (title: string, query: string): React.ReactNode[] => {
  if (!query.trim()) return [title]

  const parts = title.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// Format status for display: "ongoing" → "Ongoing"
const formatStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1)

export const SearchAutocomplete = ({
  items,
  isOpen,
  highlightedIndex,
  getItemProps,
  inputValue,
  getMenuProps,
  onViewAll
}: SearchAutocompleteProps) => {
  const displayItems = items.slice(0, 8)
  const hasResults = isOpen && displayItems.length > 0

  return (
    <ul
      className={`search-autocomplete${hasResults ? '' : ' hidden'}`}
      {...getMenuProps()}
      onMouseDown={(e) => {
        // Only prevent default on non-item clicks (e.g. "View all" button)
        const target = e.target as HTMLElement
        if (target.closest('.search-autocomplete-view-all')) {
          e.preventDefault()
        }
      }}
    >
      {isOpen && displayItems.length > 0 && (
        <>
          {displayItems.map((item, index) => (
            <li
              key={item.id}
              className={`search-autocomplete-item ${
                highlightedIndex === index ? 'highlighted' : ''
              }`}
              {...getItemProps({ item, index })}
            >
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} />
              ) : (
                <div className="cover-placeholder" />
              )}
              <div className="autocomplete-info">
                <div className="title">{highlightMatch(item.title, inputValue)}</div>
                <div className="meta">
                  <span className="status">{formatStatus(item.status)}</span>
                  {item.latestChapter && (
                    <>
                      <span className="separator">·</span>
                      <span>Chapter {item.latestChapter}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
          {onViewAll && (
            <li
              className="search-autocomplete-view-all"
              onClick={onViewAll}
            >
              <span>View all results</span>
              <FiArrowRight />
            </li>
          )}
        </>
      )}
    </ul>
  )
}
