# Phase 01 — Reader Data Fetching

## Context
- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: None (hooks/services already exist)
- **Docs**: [codebase-summary.md](../../docs/codebase-summary.md), [system-architecture.md](../../docs/system-architecture.md)

## Overview
- **Date**: 2026-02-06
- **Description**: Create ReaderContext and integrate API data fetching into Read.tsx
- **Priority**: P1
- **Implementation status**: Pending
- **Review status**: Pending

## Key Insights
- Read.tsx is a route component at `/read/:slug/:lang?/:chapter?`
- URL param `chapter` has format `chapter-{number}` (e.g. `chapter-241`) — need to extract `241`
- `useChapterDetail(mangaSlug, number, language?)` returns `ChapterWithPages` with `pages[]` and `navigation`
- ReadLayout renders `<Header />` and layout components independently of `<Views />` (Read.tsx) — need shared context to pass chapter data to both

## Requirements
1. Create `ReaderContext` to share chapter data across reader components
2. Replace hardcoded 56-image array in Read.tsx with API data
3. Add loading/error states
4. Parse URL params correctly

## Architecture

### ReaderContext (new file: `src/contexts/reader-context.tsx`)
```typescript
interface ReaderContextValue {
  chapter: ChapterWithPages | undefined
  chapterList: { items: Chapter[], meta?: PaginationMeta }
  mangaSlug: string
  language: string
  totalPages: number
  isLoading: boolean
  isError: boolean
}
```

**WHY Context?** Because `ReadLayout.tsx` renders `<Header />` and `<SubPanels />` as siblings of `<Views />` (which contains `Read.tsx`). There's no parent-child relationship to pass props. Context bridges this gap.

### Data Flow
```
ReaderContext.Provider (wraps ReadLayout)
  ├── Header.tsx          → reads chapter number, total pages, total chapters
  ├── ProgressBar.tsx     → reads totalPages
  ├── SubPanelChapter.tsx → reads chapterList
  ├── SubPanelPage.tsx    → reads totalPages
  └── Read.tsx            → reads pages[], navigation
```

## Related Code Files
- `apps/web/src/views/read/Read.tsx` — main reader component (MODIFY)
- `apps/web/src/hooks/use-chapters.ts` — useChapterDetail, useChapterList hooks (USE)
- `apps/web/src/services/chapter-service.ts` — API client (USE)
- `apps/web/src/components/layouts/ReadLayout.tsx` — layout wrapper (MODIFY to add Provider)
- `apps/web/src/configs/routes.config/appsRoute.tsx` — route definition (READ for params)

## Implementation Steps

### Step 1: Create ReaderContext
- New file: `src/contexts/reader-context.tsx`
- Export `ReaderProvider` component and `useReader` hook
- ReaderProvider accepts `children` and reads URL params via `useParams()`
- Calls `useChapterDetail()` and `useChapterList()` internally
- Extracts chapter number from URL param: `chapter?.replace('chapter-', '')`
- Default language to `'en'` when not in URL

### Step 2: Wrap ReadLayout with ReaderProvider
- Import ReaderProvider in ReadLayout.tsx
- Wrap the entire layout content with `<ReaderProvider>`
- Replace hardcoded `56` references with context values

### Step 3: Update Read.tsx to use context
- Remove `imagePath()` function
- Remove `new Array(56)` usage
- Import `useReader()` to get `chapter.pages` and `chapter.navigation`
- Pass `pages` to child components
- Replace `pageIndex < 56` with `pageIndex < totalPages`
- Build prev/next chapter links from `navigation`
- Add loading state: show `<Spinner />` while fetching
- Add error state: show error message if API fails

## Todo List
- [ ] Create `src/contexts/reader-context.tsx` with ReaderProvider + useReader
- [ ] Update ReadLayout.tsx to wrap with ReaderProvider
- [ ] Update Read.tsx: remove mock data, use context, add loading/error states
- [ ] Replace hardcoded `56` in Read.tsx `handleChangePage` with `totalPages`

## Success Criteria
- Reader fetches real chapter data from API on page load
- Loading spinner shows while data loads
- Error message shows if API call fails
- Previous/next chapter links work with real navigation data
- URL params correctly parsed for slug, language, chapter number

## Risk Assessment
- **Low**: API may return empty pages[] if no seed data exists → show "No pages" message
- **Low**: URL param format mismatch → defensive parsing with fallback

## Security Considerations
- None — all endpoints are public GET requests

## Next Steps
→ Phase 02: Update page type components (Single, LongStrip, Double) to receive pages from context
