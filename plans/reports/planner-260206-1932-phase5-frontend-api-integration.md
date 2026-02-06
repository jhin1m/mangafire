# Planner Report: Phase 5 - Frontend API Integration

**Date**: 2026-02-06
**Plan**: `plans/260206-1932-phase5-frontend-api-integration/`

## Summary

Created comprehensive 5-phase implementation plan to replace all hardcoded mock data in the MangaFire frontend with real API calls. Plan introduces TanStack Query for server-state management, a centralized HTTP client with JWT interceptor, a service/hook layer, and view-level integration across Home, Filter, and Manga Detail pages.

## Key Decisions

1. **TanStack Query over RTK Query** -- simpler caching, not coupled to Redux, less boilerplate. Redux stays for UI state only.
2. **Native fetch wrapper, not axios** -- follows existing auth-service pattern, avoids new dependency.
3. **Store import (not hooks) in api-client** -- services run outside React component tree, so direct store import for token access.
4. **Vite proxy for dev** -- currently no proxy configured; `/api` calls from :5173 will fail without it.

## Parallelization Structure

```
Phase 01 (Infra) ──┐
                    ├──> Phase 03 (Home)
Phase 02 (Hooks) ──┤──> Phase 04 (Filter)
                    └──> Phase 05 (Detail)
```

- 01 + 02: fully parallel (agree on apiClient interface upfront)
- 03 + 04 + 05: fully parallel after 01 + 02 complete

## Files Created

| File | Purpose |
|------|---------|
| `plan.md` | Overview, dependency graph, file ownership matrix |
| `phase-01-api-infrastructure.md` | HTTP client, React Query setup, Vite proxy |
| `phase-02-services-and-hooks.md` | Service layer + custom hooks (10 new files) |
| `phase-03-home-page-integration.md` | TopTrending, MostViewed, RecentlyUpdated, NewRelease |
| `phase-04-filter-page-integration.md` | Filter page + Genre dropdown from API |
| `phase-05-manga-detail-integration.md` | Manga detail, chapters, volumes, recommend |

## Effort Estimate

| Phase | Effort | Parallel Group |
|-------|--------|---------------|
| 01 | 2h | A |
| 02 | 2h | A |
| 03 | 2h | B |
| 04 | 2h | B |
| 05 | 4h | B |
| **Total** | **12h** (6h wall-clock with 2 devs) | |

## Critical Risks

1. **Data shape mismatch**: Frontend components expect `{ image, title, desc, genres[], chapters[] }` but API `Manga` has `{ coverImage, title, description, status }`. Mapper functions needed at each integration point.
2. **Missing features**: API doesn't support multi-genre filter, year filter, length filter. UI will be partially functional.
3. **Empty DB**: Without seed data, all pages will show empty state. DB seeding should happen before integration testing.

## Unresolved Questions (Aggregated)

1. Should `auth-service.ts` be refactored to use the new `apiClient`? Recommended: defer.
2. `RecentlyUpdated` Card expects `chapters[]` from list endpoint -- not available. Leave empty for MVP.
3. API supports single `genreId` but filter UI allows multi-select. Backend enhancement needed later.
4. Filter UI has `year`/`length` dropdowns with no API support. Leave non-functional or hide?
5. `GenreEntity` type (from DB: `{ id, name, slug, description }`) not in shared package. Add or inline?
6. Read page route format unclear for chapter links (`/read/:slug/:lang?/:chapter?`).
