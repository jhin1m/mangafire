# Phase 03 — Layout & Navigation Components

## Context
- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 01 (ReaderContext), Phase 02 (page components working)
- **Docs**: [code-standards.md](../../docs/code-standards.md)

## Overview
- **Date**: 2026-02-06
- **Description**: Update layout components (ReadLayout, Header, ProgressBar, SubPanelChapter, SubPanelPage) to use real data from ReaderContext
- **Priority**: P1
- **Implementation status**: Pending
- **Review status**: Pending

## Key Insights
- ReadLayout.tsx has hardcoded `56` in keyboard handler (ArrowRight bound) and CSS class logic
- Header.tsx shows hardcoded "chapter 241/241" and "56" total pages
- ProgressBar.tsx renders `new Array(56)` dots and shows "56" text
- SubPanelChapter.tsx contains ~242 hardcoded chapter objects (jujutsu-kaisen data)
- SubPanelPage.tsx renders `new Array(56)` page links
- All these need real data from ReaderContext

## Requirements
1. ReadLayout.tsx: Replace hardcoded `56` with `totalPages` from context
2. Header.tsx: Show real chapter number and total chapters/pages
3. ProgressBar.tsx: Render correct number of progress dots
4. SubPanelChapter.tsx: Fetch and display real chapter list
5. SubPanelPage.tsx: Render correct number of page items

## Architecture

### Data Dependencies per Component

| Component | Context Fields Used |
|-----------|-------------------|
| ReadLayout.tsx | `totalPages` |
| Header.tsx | `chapter.number`, `totalPages`, `chapterList.meta.total` |
| ProgressBar.tsx | `totalPages` |
| SubPanelChapter.tsx | `chapterList.items`, `mangaSlug`, `language`, `chapter.number` |
| SubPanelPage.tsx | `totalPages` |

## Related Code Files
- `apps/web/src/components/layouts/ReadLayout.tsx` — MODIFY
- `apps/web/src/components/template/Read/Header.tsx` — MODIFY
- `apps/web/src/components/layouts/components/ProgressBar/ProgressBar.tsx` — MODIFY
- `apps/web/src/components/layouts/components/SubPanel/SubPanelChapter.tsx` — MODIFY
- `apps/web/src/components/layouts/components/SubPanel/SubPanelPage.tsx` — MODIFY

## Implementation Steps

### Step 1: Update ReadLayout.tsx
- Import `useReader()` from context
- Replace `pageIndex < 56` (line 80) with `pageIndex < totalPages`
- Replace `pageIndex === 56` (line 125) with `pageIndex === totalPages`
- Guard: if `totalPages` is 0 or undefined, use safe fallback (e.g. `Infinity` to avoid blocking navigation)

### Step 2: Update Header.tsx
- Import `useReader()` from context
- Replace hardcoded "241" in chapter number display with `chapter?.number`
- Replace hardcoded "/241" total with `chapterList.meta?.total`
- Replace hardcoded "56" total pages with `totalPages`
- Show `pageIndex` already comes from Redux (existing behavior, keep as-is)

### Step 3: Update ProgressBar.tsx
- Import `useReader()` from context
- Replace `new Array(56)` with `new Array(totalPages)`
- Replace hardcoded "56" text with `totalPages`
- Guard: render nothing if `totalPages === 0`

### Step 4: Update SubPanelChapter.tsx
- Import `useReader()` from context
- Remove the massive ~242-item hardcoded `chapters` array
- Use `chapterList.items` from context
- Build chapter links dynamically: `/read/${mangaSlug}/${language}/chapter-${chapter.number}`
- Highlight current chapter based on `chapter?.number` match
- Note: `useChapterList` in ReaderContext should fetch with `limit: 100, sortOrder: 'desc'` for full chapter list in panel
  - For manga with >100 chapters, add pagination or increase limit later

### Step 5: Update SubPanelPage.tsx
- Import `useReader()` from context
- Replace `new Array(56)` with `new Array(totalPages)`
- Guard: render nothing if `totalPages === 0`

## Todo List
- [ ] Update ReadLayout.tsx: replace hardcoded 56 with totalPages
- [ ] Update Header.tsx: show real chapter number and totals
- [ ] Update ProgressBar.tsx: render dynamic page count
- [ ] Update SubPanelChapter.tsx: remove hardcoded chapters, use API data
- [ ] Update SubPanelPage.tsx: render dynamic page count

## Success Criteria
- Header shows correct current chapter number and total chapters from API
- Header shows correct total page count for current chapter
- ProgressBar renders correct number of dots matching actual pages
- SubPanelChapter displays real chapter list from API
- SubPanelChapter highlights current chapter
- SubPanelPage renders correct number of page items
- Keyboard navigation (ArrowLeft/Right) respects actual page count
- "on-last-page" CSS class applies correctly at actual last page

## Risk Assessment
- **Medium**: SubPanelChapter with `limit: 100` may not show all chapters for long manga → acceptable for now, add pagination later
- **Low**: ProgressBar with many pages (100+) may overflow → existing CSS handles scrolling

## Security Considerations
- Chapter links built from API data — `mangaSlug` and `chapter.number` already validated server-side

## Next Steps
→ Manual test with real API data (requires seed data with chapters + pages)
→ Update project roadmap Phase 5 checklist items
