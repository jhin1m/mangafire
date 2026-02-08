# Frontend Search UX & Autocomplete Research Report

**Date**: 2026-02-08
**Project**: MangaFire Phase 7 (Advanced Search)
**Scope**: Modern autocomplete patterns, faceted search UI, React implementation, accessibility

---

## Executive Summary

Modern search UX combines three key elements: **autocomplete with keyboard navigation**, **faceted filtering with active chips**, and **performant caching with TanStack Query**. Best practice limits dropdown suggestions to 8-10 items (mobile/desktop) to avoid decision paralysis.

---

## 1. Autocomplete Input UX Patterns

### Core Behaviors
- **Debounce input**: Trigger suggestions after 300ms of inactivity (reduce API load)
- **Keyboard navigation**: Arrow keys (Up/Down), Enter to select, Escape to close
- **Copy-on-focus**: When suggestion receives keyboard focus, copy its text to input field (improves UX comprehension)
- **Max visible items**: 8-10 suggestions max (exceeding causes user abandonment)
- **Empty state**: Show placeholder text or "No results" when query matches nothing

### Input Debouncing Pattern
```javascript
// React hook example
const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounce(searchQuery, 300)

// TanStack Query with debounced key
const { data: suggestions } = useQuery({
  queryKey: ['manga-search', debouncedQuery],
  queryFn: () => api.searchManga(debouncedQuery),
  enabled: debouncedQuery.length > 0,
  staleTime: 60000, // 1 min cache
})
```

### Focus Management
- Clear input on Escape
- Focus returns to input after selection
- Up/Down arrows wrap at list boundaries

---

## 2. Faceted Search with Chips

### Layout Strategy
- **Filter dropdowns**: Trigger from header or sidebar (genre, status, rating)
- **Active chips row**: Show selected filters horizontally below search bar
- **Typeahead in dropdowns**: Add search input for large facet lists (e.g., 50+ genres)
- **Clear all**: Single button to reset all active filters

### Filter Chips Pattern
```jsx
// Active filters display
<div className="filters-chips">
  {activeFilters.map(filter => (
    <span key={filter.id} className="filter-chip">
      {filter.label}
      <button onClick={() => removeFilter(filter.id)}>✕</button>
    </span>
  ))}
  {activeFilters.length > 0 && (
    <button onClick={() => clearAllFilters()}>Clear all</button>
  )}
</div>
```

### Multi-Select Dropdowns
- Use tri-state checkboxes (unchecked → partial → checked)
- Show filter counts: "Action (12)" → "Action (8 remaining after other filters)"
- Support AND/OR logic: All selected genres = OR behavior by default

---

## 3. React Autocomplete Libraries & Patterns

### Recommended: Downshift
**Why**: Minimal, headless, WAI-ARIA compliant, perfect for custom styling
**Tradeoff**: More manual setup vs. pre-built MUI Autocomplete
**MangaFire fit**: ✅ Works with plain CSS, no dependency on Material-UI

```javascript
// Pseudocode with Downshift
import { useCombobox } from 'downshift'

export function SearchInput() {
  const [items, setItems] = useState([])
  const {
    isOpen,
    inputValue,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items,
    onInputValueChange: ({ inputValue }) => {
      // Trigger search with debounce
      fetchSuggestions(inputValue)
    },
  })

  return (
    <>
      <input {...getInputProps()} placeholder="Search manga..." />
      {isOpen && (
        <ul>
          {items.map((item, idx) => (
            <li
              key={item.id}
              {...getItemProps({ item, index: idx })}
              className={highlightedIndex === idx ? 'highlighted' : ''}
            >
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
```

### Alternative: Headless UI Combobox
**Why**: React 18+ optimized, uses Slots API, cleaner template syntax
**Downside**: Still requires styling from scratch
**Good for**: Teams preferring Headless UI ecosystem

---

## 4. TanStack Query Caching Strategy

### Query Keys for Search
Use composite keys to cache variations:
```javascript
// Search with filters
['manga-search', { query, genres, status, page }]

// Suggestions autocomplete
['manga-suggestions', searchQuery]

// Genre facets (rarely change)
['genres', 'all']
```

### Cache Configuration
- **staleTime**: 60000ms (1 min) for search results → refetch after user navigates away
- **gcTime**: 300000ms (5 min) default — data stays in memory after unmount
- **enabled**: Only fetch if `query.length > 0` (avoid empty searches)

### Request Cancellation
```javascript
// TanStack Query auto-cancels prev requests on new query
const { data, isFetching } = useQuery({
  queryKey: ['manga-search', debouncedQuery],
  queryFn: ({ signal }) => api.searchManga(debouncedQuery, { signal }),
  // signal auto-cancels fetch if new query arrives
})
```

---

## 5. Accessibility Requirements (WCAG 2.1 AA)

### ARIA Labels & Live Regions
```jsx
// Search input with label
<label htmlFor="search-input">Search manga by title</label>
<input
  id="search-input"
  aria-autocomplete="list" // tells screen reader autocomplete exists
  aria-expanded={isOpen}    // tells if dropdown is open
  aria-controls="suggestions-listbox"
  aria-label="Manga search"
/>

// Live region for suggestion updates
<div
  role="listbox"
  id="suggestions-listbox"
  aria-live="polite" // announce updates without interrupting
  aria-label="Search suggestions"
>
  {suggestions.map(s => (
    <div key={s.id} role="option" aria-selected={isSelected}>
      {s.title}
    </div>
  ))}
</div>
```

### Keyboard Support
- Tab: Focus search input
- Type: Filter suggestions (auto-focus first result)
- ArrowDown/ArrowUp: Navigate list
- Enter: Select highlighted item
- Escape: Close dropdown, clear input
- Tab+Shift: Reverse focus direction

### Screen Reader Announcements
- Announce result count: "12 manga found"
- Announce selection: "Naruto selected"
- Announce empty state: "No manga match 'xyz'"

---

## 6. MangaFire-Specific Recommendations

### Architecture Integration
1. **Redux state**: Store `searchQuery`, `activeFilters`, `suggestions` in Redux slice (or local component state if small scope)
2. **Routes**: New `/search` route or modal overlay on `/home`
3. **TanStack Query**: Already compatible with Redux + React Router setup
4. **CSS**: Extend existing `.dropdown.css` for autocomplete styling

### Implementation Path
```
Phase 1: Basic autocomplete
  └─ Input + debounce + API call + suggestion list

Phase 2: Keyboard navigation
  └─ Downshift integration + arrow/enter/escape handling

Phase 3: Faceted filters
  └─ Genre chips, status dropdown, clear all button

Phase 4: Caching & performance
  └─ TanStack Query, request cancellation, stale-while-revalidate

Phase 5: Accessibility & polish
  └─ ARIA labels, live regions, screen reader testing
```

### Library Stack (Recommended)
- **Downshift** (1.8kb gzip) — headless autocomplete primitive
- **TanStack Query v5** — already in ecosystem (caching/refetch)
- **useDebounce hook** — custom or `ahooks` library (5kb gzip)
- **No new CSS framework** — extend plain CSS modules

### Performance Goals
- Suggestion dropdown: <100ms time-to-interaction
- Request cancellation: Avoid double-fetching when user types fast
- Virtual scrolling: If facet lists exceed 50 items (use `react-window`)

---

## Key Sources

- [Autocomplete UX Patterns](https://uxpatterns.dev/patterns/forms/autocomplete) — UX Patterns for Developers
- [Baymard Autocomplete Best Practices](https://baymard.com/blog/autocomplete-design) — 81% quality metrics
- [Downshift Documentation](https://www.downshift-js.com/) — Kent C. Dodds' WAI-ARIA primitives
- [Headless UI Combobox](https://headlessui.com/v1/react/combobox) — Tailwind Labs
- [TanStack Query Caching](https://tanstack.com/query/v4/docs/react/guides/caching) — Official docs
- [MDN aria-autocomplete](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-autocomplete) — W3C standard
- [Filter UI Design Patterns](https://bricxlabs.com/blogs/universal-search-and-filters-ui) — 15 proven patterns (2025)

---

## Unresolved Questions

1. **Search scope**: Manga titles only, or include author/synopsis search?
2. **Filter persistence**: Should active filters stay across page navigation?
3. **Recent searches**: Store in localStorage for UX benefit?
4. **Real-time vs search-on-enter**: Instant results or only on Enter key?
5. **Mobile keyboard**: Special handling for mobile autocomplete (avoid virtual keyboard dismissal)?
