# Phase 05 - Search Integration & State

## Context

- Research: [Frontend Search UX Report](./research/researcher-frontend-search-ux-report.md)
- Docs: [System Architecture](../../docs/system-architecture.md), [Code Standards](../../docs/code-standards.md)
- Existing: Header.tsx (search bar at lines 172-189), appsRoute.tsx (routes), TanStack Query already installed

## Parallelization

- **Depends on**: Phase 02 (API), Phase 03 (types), Phase 04 (UI components)
- **Blocks**: Nothing (final phase)

## Overview

| Field | Value |
|---|---|
| Date | 2026-02-08 |
| Priority | P1 |
| Status | pending |
| Effort | 4h |
| Description | Wire search components to API via TanStack Query, add search history, integrate into Header, create /search results page |

## Key Insights from Research

- **TanStack Query** already in `apps/web` dependencies (^5.90.20) — use composite query keys
- **300ms debounce** for autocomplete input to reduce API load
- **staleTime: 60000** (1 min) for search results; **gcTime: 300000** (5 min)
- **Request cancellation**: TanStack Query auto-cancels via AbortSignal on new query
- **localStorage search history**: Max 10 items, deduplicate, newest first

## Requirements

1. `useDebounce` hook — debounce search input by 300ms
2. `useSearch` hook — TanStack Query wrapper for autocomplete + full search
3. `useSearchHistory` hook — localStorage read/write for recent searches
4. Compose Downshift `useCombobox` with SearchInput + SearchAutocomplete in Header
5. `/search` route with SearchResults page (full search mode)
6. Filter chips on search results page
7. Keyboard navigation: Escape closes dropdown, Enter navigates to /search or selects suggestion
8. CSS import for search.css in index.css

## Architecture

```
Header.tsx
├── useCombobox (Downshift) — manages dropdown state
├── useSearch('autocomplete', debouncedQuery) — TanStack Query
├── useSearchHistory() — localStorage
├── SearchInput (Phase 04)
├── SearchAutocomplete (Phase 04)
└── SearchHistory (Phase 04)

/search route
├── useSearch('full', query, filters) — TanStack Query
├── SearchFilters (Phase 04)
├── Existing Card component — render results
└── Existing Pagination component
```

### Query Key Structure

```typescript
['search', 'autocomplete', debouncedQuery]           // autocomplete
['search', 'full', { q, status, type, genreId, page }] // full search
```

## File Ownership (Exclusive)

| File | Action |
|---|---|
| `apps/web/src/services/search-service.ts` | **New file** — API calls for search (follows existing service pattern) |
| `apps/web/src/hooks/useDebounce.ts` | New file |
| `apps/web/src/hooks/useSearch.ts` | New file |
| `apps/web/src/hooks/useSearchHistory.ts` | New file |
| `apps/web/src/hooks/query-keys.ts` | **Modify** — add `search` query key namespace |
| `apps/web/src/views/search/Search.tsx` | New file — search results page |
| `apps/web/src/views/search/index.ts` | New file — barrel export |
| `apps/web/src/components/template/Default/Header.tsx` | Modify — replace static search form with composed components |
| `apps/web/src/configs/routes.config/appsRoute.tsx` | Modify — add /search route |
| `apps/web/src/index.css` | Modify — add `@import './assets/styles/search.css'` |

No other phase touches these files.

### Codebase Patterns to Follow

- **Service pattern**: All API calls go through `*-service.ts` files using `apiClient` from `api-client.ts`
- **Query keys**: Centralized in `hooks/query-keys.ts` — add `search` namespace
- **Hook naming**: kebab-case files (`use-search.ts`), not camelCase (`useSearch.ts`)
- **apiClient limitation**: Current `apiClient.get()` does NOT support `signal` param for AbortController. Options:
  1. TanStack Query v5 auto-cancels duplicate requests (sufficient for most cases)
  2. If explicit abort needed later, extend `apiClient.get()` to accept `RequestInit` options

## Implementation Steps

1. **Create `use-debounce.ts`** (kebab-case — matches codebase convention `use-manga-list.ts`):
   ```typescript
   // Generic debounce hook
   function useDebounce<T>(value: T, delay: number): T
   ```
   Uses `useState` + `useEffect` with `setTimeout`/`clearTimeout`.

2. **Create `use-search-history.ts`**:
   - `SEARCH_HISTORY_KEY = 'mangafire_search_history'`
   - `MAX_HISTORY = 10`
   - Returns `{ history, addEntry, removeEntry, clearHistory }`
   - `addEntry(q)`: deduplicate, prepend, trim to max
   - Reads/writes `localStorage` directly (no Redux — transient UI data)

2.5. **Create `search-service.ts`** (follows existing pattern: `manga-service.ts`, `chapter-service.ts`):
   ```typescript
   import { apiClient } from './api-client'
   import type { SearchAutocompleteItem, SearchFullItem } from '@mangafire/shared/types'
   import type { ApiResponse, PaginationMeta } from '@mangafire/shared/types'

   export const searchService = {
     autocomplete(q: string): Promise<ApiResponse<SearchAutocompleteItem[]>> {
       return apiClient.get('/api/search', { q, mode: 'autocomplete' })
     },
     fullSearch(params: Record<string, unknown>): Promise<ApiResponse<SearchFullItem[]>> {
       return apiClient.get('/api/search', { ...params, mode: 'full' })
     },
   }
   ```

3. **Create `use-search.ts`**:
   ```typescript
   export function useSearchAutocomplete(query: string) {
     return useQuery({
       queryKey: ['search', 'autocomplete', query],
       queryFn: ({ signal }) => fetchAutocomplete(query, signal),
       enabled: query.length >= 1,
       staleTime: 60_000,
     })
   }

   export function useSearchFull(params: SearchParams) {
     return useQuery({
       queryKey: ['search', 'full', params],
       queryFn: ({ signal }) => fetchFullSearch(params, signal),
       enabled: params.q.length >= 1,
       staleTime: 60_000,
     })
   }
   ```
   - Use `searchService` from `search-service.ts` (NOT direct fetch)
   - Use `queryKeys.search.*` from `query-keys.ts`

4. **Create `/search` route + page**:
   - `views/search/Search.tsx`:
     - Reads `q`, `status`, `type`, `genreId`, `page` from URL search params
     - Calls `useSearchFull(params)`
     - Renders SearchFilters, result cards (reuse existing Card component), Pagination
     - Loading state: existing Loading component
     - Empty state: "No manga found for '{query}'"
   - Add to `appsRoute.tsx`:
     ```typescript
     { key: 'app.search', path: '/search', component: lazy(() => import('@/views/search')), authority: [] }
     ```

5. **Integrate search into Header.tsx**:
   - Replace static `<form>` in `.search-inner` with composed search components
   - Wire `useCombobox` from Downshift:
     - `items` = autocomplete results from `useSearchAutocomplete(debouncedQuery)`
     - `onSelectedItemChange` → navigate to `/manga/${item.slug}`
     - `onInputValueChange` → update local search state
   - Show SearchHistory when input focused + query empty
   - On Enter with no selection → navigate to `/search?q=${query}`
   - On Escape → close dropdown

6. **Update `index.css`**:
   - Add `@import './assets/styles/search.css';` after dropdown.css import

7. **Test full flow**:
   - Type in header → autocomplete dropdown appears
   - Select suggestion → navigates to manga page
   - Press Enter → navigates to /search?q=...
   - Filter on search page → updates results
   - Search history populates and persists

## Todo

- [ ] Create useDebounce hook
- [ ] Create useSearchHistory hook
- [ ] Create useSearch hook (autocomplete + full)
- [ ] Create Search view (search results page)
- [ ] Add /search route to appsRoute.tsx
- [ ] Integrate search components into Header.tsx
- [ ] Wire Downshift useCombobox in Header
- [ ] Add search.css import to index.css
- [ ] Test autocomplete flow end-to-end
- [ ] Test full search with filters
- [ ] Test keyboard navigation
- [ ] Test search history persistence
- [ ] Test mobile responsiveness

## Success Criteria

- Typing in header search shows autocomplete suggestions within 400ms (300ms debounce + API)
- Selecting autocomplete item navigates to `/manga/:slug`
- Enter key navigates to `/search?q=...`
- Search results page displays paginated, filterable results
- Search history persists across page reloads (localStorage)
- Keyboard navigation works: ArrowUp/Down, Enter, Escape
- No duplicate API calls (TanStack Query deduplication)
- Request cancellation works (fast typing doesn't create race conditions)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Downshift + existing Header CSS conflicts | Medium | Medium | Use scoped `.search-*` classes; test overlay behavior |
| TanStack Query cache key collision | Low | Low | Namespaced keys: `['search', mode, ...]` |
| Mobile virtual keyboard covers autocomplete | Medium | Medium | Position dropdown above input on mobile (CSS media query) |
| Header.tsx refactor scope creep | Medium | High | Only replace `.search-inner` contents; keep all other Header logic unchanged |

## Security Considerations

- Search query sanitized by Zod on API side (Phase 02)
- Frontend applies `maxLength={200}` on input
- localStorage history stores only query strings (no sensitive data)
- No `dangerouslySetInnerHTML` — text highlighting uses safe string operations
- API calls use fetch with AbortSignal (prevents response after unmount)

## Next Steps

After Phase 05, Phase 7 (Advanced Search) is complete. Future enhancements:
- Redis caching for popular queries (if performance degrades at scale)
- Search analytics (track popular queries for homepage suggestions)
- Author/artist search fields in search_vector (weight C)
- Multilingual FTS config for JP/KO/ZH titles
