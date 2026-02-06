# Phase 02 — Reader Page Components

## Context
- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 01 (ReaderContext must exist)
- **Docs**: [code-standards.md](../../docs/code-standards.md)

## Overview
- **Date**: 2026-02-06
- **Description**: Update Single, LongStripImage, and DoubleImage components to use real page data from ReaderContext
- **Priority**: P1
- **Implementation status**: Pending
- **Review status**: Pending

## Key Insights
- All three components currently generate image URLs via `imagePath()` or receive hardcoded `src` prop
- `ChapterPage` type provides: `{ id, chapterId, pageNumber, imageUrl, width, height }`
- Components only need `imageUrl` and `pageNumber` from each ChapterPage
- Long strip and double modes iterate directly — single mode uses Swiper

## Requirements
1. Single.tsx: Replace `new Array(56)` with `pages` from context
2. LongStripImage.tsx: Accept `imageUrl` instead of hardcoded `src`
3. DoubleImage.tsx: Accept `imageUrl` instead of hardcoded `src`
4. All modes should work with any number of pages (not fixed 56)

## Architecture

### Component Props Changes

**Before:**
```typescript
// LongStripImage
type LongStripImageProps = { index: number; src: string }

// DoubleImage
type DoubleImageProps = { index: number; src: string; left?: boolean; right?: boolean }

// Single — no props, hardcodes 56 images internally
```

**After:**
```typescript
// LongStripImage — same interface, caller passes imageUrl as src
// No interface change needed, just different src value from parent

// DoubleImage — same interface
// No interface change needed

// Single — receives pages from context
// Uses useReader() hook internally
```

## Related Code Files
- `apps/web/src/views/read/components/PageType/Single.tsx` — MODIFY
- `apps/web/src/views/read/components/PageType/LongStripImage.tsx` — NO CHANGE (props are fine, parent changes src)
- `apps/web/src/views/read/components/PageType/DoubleImage.tsx` — NO CHANGE (props are fine, parent changes src)
- `apps/web/src/views/read/Read.tsx` — already updated in Phase 01, passes real data

## Implementation Steps

### Step 1: Update Single.tsx
- Remove internal `imagePath()` function
- Import `useReader()` from context
- Get `chapter.pages` from context
- Replace `new Array(56).fill(undefined).map(...)` with `pages.map(page => ...)`
- Use `page.imageUrl` instead of `imagePath(index)`
- Both swiper and non-swiper modes need updating

### Step 2: Verify Read.tsx passes correct data
- Read.tsx (Phase 01) already passes `page.imageUrl` as `src` to LongStripImage and DoubleImage
- No changes needed in LongStripImage.tsx or DoubleImage.tsx — they already accept `src` prop
- Verify `index` prop still maps correctly (0-based)

### Step 3: Test all three reading modes
- Long Strip: scrollable vertical layout
- Single Page: one page at a time (swiper + non-swiper)
- Double Page: two pages side by side

## Todo List
- [ ] Update Single.tsx: remove `imagePath()`, use context pages
- [ ] Verify Read.tsx passes `page.imageUrl` as `src` to LongStripImage/DoubleImage
- [ ] Ensure all three page type modes render correctly with dynamic page count

## Success Criteria
- Long strip mode renders all pages from API in vertical scroll
- Single page mode (swiper) navigates through real pages
- Single page mode (non-swiper) shows correct page based on pageIndex
- Double page mode displays real pages side by side
- All modes handle variable page counts (not hardcoded to 56)

## Risk Assessment
- **Low**: Swiper may need `key` prop update when pages change → use chapter ID in key
- **Low**: Image loading may be slow for many pages → existing lazy load in Image.tsx handles this

## Security Considerations
- `imageUrl` from API rendered in `<img src>` — ensure URLs are from trusted sources (controlled by admin)

## Next Steps
→ Phase 03: Update layout components (Header, ProgressBar, SubPanels)
