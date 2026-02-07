---
title: "Fix Filter Pages API Integration"
description: "Align frontend sort/filter values with backend enum, add route-aware defaults, dynamic Head, genre slug support"
status: completed
priority: P1
effort: 3h
branch: main
tags: [frontend, backend, shared, filter, sorting, api-integration]
created: 2026-02-07
---

# Fix Filter Pages API Integration

## Problem
Filter pages (`/filter`, `/newest`, `/updated`, `/added`, `/genre/:slug`) share one `Filter.tsx` component already wired to the API, but sort values are mismatched (frontend sends `recently_updated`, backend expects `createdAt`), routes lack default sorting, Head is hardcoded, and `/genre/:slug` doesn't auto-apply the genre from URL.

## Phases

### Phase A: Backend + Shared (no FE dependency)
**Files**: `packages/shared/src/validators/manga.ts`, `packages/shared/src/types/manga.ts`, `apps/api/src/routes/manga-helpers.ts`
**Details**: [phase-a-backend-shared.md](./phase-a-backend-shared.md)
- Add `updatedAt` + `releaseYear` to `sortBy` enum in validator + type
- Add `updatedAt` + `releaseYear` mapping in `getSortConfig()`

### Phase B: Frontend (depends on Phase A)
**Files**: `apps/web/src/views/filter/Filter.tsx`, `apps/web/src/views/filter/components/Filters/components/Sort.tsx`, `apps/web/src/views/filter/components/Head/Head.tsx`, `apps/web/src/configs/routes.config/appsRoute.tsx`
**Details**: [phase-b-frontend.md](./phase-b-frontend.md)
- Remap Sort dropdown values to match backend enum
- Add route-aware default sorting + genre slug extraction
- Dynamic Head (title + count from API)
- Remove duplicate `/newest` route

### Phase C: Documentation (parallel with A+B)
**Files**: `docs/project-roadmap.md`
**Details**: [phase-c-docs.md](./phase-c-docs.md)
- Update Phase 5 to reflect filter integration gaps fixed

## Dependency Graph
```
Phase A (backend+shared) ──> Phase B (frontend)
Phase C (docs) ─────────────> (independent)
```

## File Ownership Matrix
| File | Phase | Change |
|------|-------|--------|
| `packages/shared/src/validators/manga.ts` | A | Add `updatedAt` + `releaseYear` to sortBy enum |
| `packages/shared/src/types/manga.ts` | A | Add `updatedAt` + `releaseYear` to MangaQueryParams.sortBy |
| `apps/api/src/routes/manga-helpers.ts` | A | Add `updatedAt` + `releaseYear` to getSortConfig() |
| `apps/web/src/views/filter/components/Filters/components/Sort.tsx` | B | Map 9 sort options to backend enum values |
| `apps/web/src/views/filter/Filter.tsx` | B | Route-aware defaults, genre slug, pass total to Head |
| `apps/web/src/views/filter/components/Head/Head.tsx` | B | Accept title+count props |
| `apps/web/src/configs/routes.config/appsRoute.tsx` | B | Remove duplicate /newest |
| `docs/project-roadmap.md` | C | Update filter integration status |

## Validation Summary

**Validated:** 2026-02-07
**Questions asked:** 6

### Confirmed Decisions
1. **Sort options**: Keep all 9 options, map unsupported values to nearest backend equivalent (trending→views, scores→rating, mal_scores→rating, most_viewed→views, most_favourited→views, release_date→releaseYear)
2. **/newest vs /added**: DIFFERENT — `/newest` = sort by `releaseYear` desc, `/added` = sort by `createdAt` desc
3. **Invalid genre slug**: Show all manga, title fallback to "Filter" (accepted)
4. **Genre loading flash**: Accepted — TanStack Query cache handles subsequent visits
5. **releaseYear column**: Confirmed exists in `manga` table (integer, nullable)
6. **Sort fallback mapping**: Map to nearest backend value (not all to createdAt)

### Action Items (plan changes needed)
- [ ] Phase A: Add `releaseYear` to sortBy enum + getSortConfig() (in addition to `updatedAt`)
- [ ] Phase B: Keep all 9 Sort dropdown options, add frontend mapping layer `recently_updated→updatedAt`, `recently_added→createdAt`, `release_date→releaseYear`, `trending→views`, `scores→rating`, `mal_scores→rating`, `most_viewed→views`, `most_favourited→views`, `title_az→title`
- [ ] Phase B: Change ROUTE_CONFIG for `/newest` to use `sortBy: 'releaseYear'` instead of `createdAt`

## Verification
```bash
pnpm type-check        # All 3 packages pass
pnpm dev:api           # Backend accepts updatedAt, releaseYear sort
pnpm dev:web           # /newest sorts by releaseYear; /updated by updatedAt; /added by createdAt; /genre/:slug auto-filters
```
