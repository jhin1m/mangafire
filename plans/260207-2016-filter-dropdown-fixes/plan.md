---
title: "Fix filter dropdown features"
description: "Fix sort defaults, Name A-Z order, implement year/length backend filters, wire frontend"
status: completed
priority: P1
effort: 3h
branch: main
tags: [filter, dropdown, backend, frontend, shared]
created: 2026-02-07
---

# Filter Dropdown Fixes

## Scope

1. Route-specific default sort selection (`/newest`, `/updated`, `/added`)
2. Year filter — backend + frontend wiring
3. Length filter (chapter count subquery) — backend + frontend wiring
4. Name A-Z sort direction fix (DESC -> ASC)
5. Status enum mismatch fix (FE → BE alignment)

## Dependency Graph

```
Phase 1 (Shared) ─┬─> Phase 2 (Backend)
                   └─> Phase 3 (Frontend)
```

Phase 2 and 3 run **in parallel** after Phase 1 completes.

## File Ownership Matrix

| File | Phase |
|------|-------|
| `packages/shared/src/types/manga.ts` | 1 |
| `packages/shared/src/validators/manga.ts` | 1 |
| `apps/api/src/routes/manga-helpers.ts` | 2 |
| `apps/web/src/views/filter/Filter.tsx` | 3 |
| `apps/web/src/views/filter/components/Filters/Filter.tsx` | 3 |
| `apps/web/src/views/filter/components/Filters/components/Sort.tsx` | 3 |
| `apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx` | 3 |
| `apps/web/src/views/filter/components/Filters/components/Year.tsx` | 3 |
| `apps/web/src/views/filter/components/Filters/components/Length.tsx` | 3 |
| `apps/web/src/@types/common.ts` | 3 |
| `apps/web/src/views/filter/components/Filters/components/Status.tsx` | 3 |

## Phases

| Phase | File | Effort | Depends On |
|-------|------|--------|------------|
| 1 — Shared types & validators | [phase-01](./phase-01-shared-types-validators.md) | 20min | None |
| 2 — Backend filter support | [phase-02](./phase-02-backend-filter-support.md) | 50min | Phase 1 |
| 3 — Frontend filter fixes | [phase-03](./phase-03-frontend-filter-fixes.md) | 90min | Phase 1 |

## Design Decisions

- **Length filter**: Use subquery `COUNT(chapters)` rather than denormalized column. Avoids migration + sync complexity. Acceptable at current scale.
- **Year filter**: Support both exact years (e.g., `2023`) and decade ranges (e.g., `2000s` -> 2000-2009). Multi-select via array param.
- **Sort defaults**: Pass `defaultSort` prop from FilterPage -> Filter -> Sort component. No Redux needed.
- **Name A-Z**: Special-case `title` sortBy to force `sortOrder: 'asc'` in `buildApiParams()`.

## Validation Summary

**Validated:** 2026-02-07
**Questions asked:** 5

### Confirmed Decisions
- **Length filter**: Subquery approach — no migration needed, acceptable at current scale
- **Year filter logic**: OR — return manga matching ANY selected year
- **Duplicate sort values**: Keep as-is, auto-select first match per value
- **Status enum mismatch**: Fix in this plan (Phase 3) — align FE values to BE enum
- **URL sync scope**: Only Sort dropdown gets `key` remount — Year/Length deferred

### Action Items
- [ ] Add Status.tsx to Phase 3 file ownership + implementation steps
- [ ] Map FE status values: `releasing` → `ongoing`, `on_hiatus` → `hiatus`, `info` → `cancelled`
