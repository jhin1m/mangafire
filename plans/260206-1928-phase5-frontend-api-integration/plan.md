---
title: "Phase 5 - Frontend API Integration"
description: "Replace all hardcoded mock data with real API calls using TanStack Query + centralized HTTP client"
status: pending
priority: P1
effort: 12h
branch: main
tags: [frontend, api-integration, react-query, data-fetching]
created: 2026-02-06
---

# Phase 5 - Frontend API Integration

## Goal
Replace 100% of hardcoded mock data in the frontend with real API calls. Introduce TanStack Query for server-state management, a centralized HTTP client with JWT interceptor, and a service/hooks layer.

## Dependency Graph

```
Phase 01 (API Infrastructure) ──┐
                                 ├──> Phase 03 (Home Page)
Phase 02 (Services + Hooks) ────┤
                                 ├──> Phase 04 (Filter Page)
                                 │
                                 └──> Phase 05 (Manga Detail)
```

Phases 01 + 02: independent, run in PARALLEL.
Phases 03 + 04 + 05: independent of each other, require 01 + 02.

## File Ownership Matrix

| Phase | New Files (Created) | Modified Files |
|-------|-------------------|----------------|
| 01 | `services/api-client.ts`, `lib/query-client.ts` | `App.tsx`, `vite.config.ts`, `package.json` |
| 02 | `services/manga-service.ts`, `services/genre-service.ts`, `services/chapter-service.ts`, `services/volume-service.ts`, `hooks/use-manga-list.ts`, `hooks/use-manga-detail.ts`, `hooks/use-genres.ts`, `hooks/use-chapters.ts`, `hooks/use-volumes.ts` | (none) |
| 03 | (none) | `TopTrending.tsx`, `TrendingCard.tsx`, `MostViewed.tsx`, `RecentlyUpdated/Content.tsx`, `NewRelease.tsx` |
| 04 | (none) | `Filter.tsx`, `filter/components/Filters/components/Genre.tsx` |
| 05 | (none) | `Manga.tsx`, `Top/Content.tsx`, `Top/Sidebar.tsx`, `Bottom/Content/Chapters.tsx`, `Bottom/Content/List.tsx`, `Bottom/Content/Menu.tsx`, `Bottom/Sidebar/Recommend.tsx` |

No file appears in multiple phases -- exclusive ownership enforced.

## Execution Strategy

1. **Dev 1** starts Phase 01. **Dev 2** starts Phase 02 simultaneously.
2. Both complete in ~2h each. Integration test: verify import paths resolve.
3. **Dev 1** takes Phase 03, **Dev 2** takes Phase 04, **Dev 3** (or either after) takes Phase 05.
4. Final integration test with `pnpm dev` and live API.

## Phase Files

- [Phase 01 - API Infrastructure](./phase-01-api-infrastructure.md)
- [Phase 02 - Services & Hooks](./phase-02-services-and-hooks.md)
- [Phase 03 - Home Page Integration](./phase-03-home-page-integration.md)
- [Phase 04 - Filter Page Integration](./phase-04-filter-page-integration.md)
- [Phase 05 - Manga Detail Integration](./phase-05-manga-detail-integration.md)

## Validation Summary

**Validated:** 2026-02-06
**Questions asked:** 6

### Confirmed Decisions
- **Data fetching library**: TanStack Query — separate server state from Redux (UI state only)
- **Missing chapters/genres in list API**: Display empty, improve later (no N+1 queries)
- **Unsupported filter dropdowns (year, length)**: Keep UI visible, no-op for now — add API support later
- **Auth service refactor**: YES — refactor `auth-service.ts` to use new `api-client.ts` (DRY)
- **Seed data**: Create seed script with ~10 manga + genres + chapters in Phase 01
- **Related manga sidebar**: Use `useMangaList` with top-rated as "recommendations" (not truly related)

### Action Items (Plan Revisions Needed)
- [ ] Phase 01: Add auth-service refactor to use api-client (new scope item)
- [ ] Phase 01: Add manga seed script (10 manga + genres + chapters) for dev testing
- [ ] Phase 05: Update Related.tsx to use `useMangaList` instead of keeping hardcoded
