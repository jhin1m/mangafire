---
title: "Phase 4: Chapters & Volumes"
description: "Database schema, API endpoints, and shared types for manga chapters and volumes management"
status: completed
priority: P1
effort: 6h
branch: main
tags: [backend, database, api, chapters, volumes]
created: 2026-02-06
reviewed: 2026-02-06
---

# Phase 4: Chapters & Volumes

## Overview

Add chapters, volumes, and chapter_pages support to MangaFire backend. Includes shared types/validators, database schema with relations, and full CRUD API endpoints. Frontend integration deferred to Phase 5.

## Dependency Graph

```
Phase 01 (Shared Types) ─────┬──> Phase 03 (Chapter API)
                              │
Phase 02 (DB Schema)    ─────┼──> Phase 03 (Chapter API)
                              │
Phase 01 + 02           ─────└──> Phase 04 (Volume API)
```

- Phase 01 + 02: **parallel** (no shared files)
- Phase 03: blocked by Phase 01 AND 02
- Phase 04: blocked by Phase 01 AND 02 (needs shared validators + DB schema)

## Execution Strategy

1. **Wave 1** (parallel): Phase 01 + Phase 02 — ~1.5h each
2. **Wave 2** (parallel): Phase 03 + Phase 04 — ~1.5h each
3. Final: `pnpm type-check && pnpm lint` across monorepo, then `pnpm db:push`

## File Ownership Matrix

| File | Owner |
|------|-------|
| `packages/shared/src/types/chapter.ts` | Phase 01 |
| `packages/shared/src/validators/chapter.ts` | Phase 01 |
| `packages/shared/src/types/index.ts` (add export) | Phase 01 |
| `packages/shared/src/validators/index.ts` (add export) | Phase 01 |
| `apps/api/src/db/schema.ts` (append tables) | Phase 02 |
| `apps/api/src/routes/chapters.ts` (new) | Phase 03 |
| `apps/api/src/routes/chapter-helpers.ts` (new) | Phase 03 |
| `apps/api/src/index.ts` (add chapter route mount) | Phase 03 |
| `apps/api/src/routes/volumes.ts` (new) | Phase 04 |
| `apps/api/src/index.ts` (add volume route mount) | Phase 04 |

> **index.ts conflict resolution**: Phase 03 appends chapter routes, Phase 04 appends volume routes. Both are append-only additions to different lines. Phase 04 should run after Phase 03 or merge carefully.

## Phases

| # | Name | Status | Effort | File |
|---|------|--------|--------|------|
| 01 | Shared Types & Validators | done | 1.5h | [phase-01-shared-types.md](./phase-01-shared-types.md) |
| 02 | Database Schema | done | 1.5h | [phase-02-database-schema.md](./phase-02-database-schema.md) |
| 03 | Chapter API Routes | done | 2h | [phase-03-chapter-api.md](./phase-03-chapter-api.md) |
| 04 | Volume API Routes | done | 1h | [phase-04-volume-api.md](./phase-04-volume-api.md) |

## Success Criteria

- [x] `pnpm type-check` passes across all packages
- [x] `pnpm db:push` creates tables without errors
- [x] All CRUD endpoints return correct status codes and response shapes
- [x] Auth middleware protects write operations
- [x] No file ownership conflicts between phases

## Validation Summary

**Validated:** 2026-02-06
**Questions asked:** 6

### Confirmed Decisions
1. **Chapter ordering**: Use `::numeric` SQL cast in ORDER BY now — fix correct ordering from the start, not defer to Phase 5
2. **Slug extraction**: Use Hono basePath param (`c.req.param('slug')`) instead of fragile URL pathname parsing. Test if Hono passes parent route params to sub-apps
3. **Pages on create**: Pages required (min 1) when creating chapter — keeps data integrity
4. **Phase 04 dependency**: Fix dependency graph — Phase 04 also depends on Phase 01 (needs shared validators)
5. **Page update endpoint**: Add `PUT /api/manga/:slug/chapters/:number/pages` to Phase 03 — replace all pages in transaction. Avoids delete+recreate chapter workflow
6. **Multi-language chapters**: Add `?language=` query param to GET single chapter, default to 'en'. Resolves ambiguity when multiple languages exist for same chapter number

### Action Items
- [x] Phase 03: Add `::numeric` cast in `orderBy` and `getChapterNavigation` queries
- [x] Phase 03: Replace URL pathname parsing with Hono param approach for slug extraction — **KEPT** URL parsing (pragmatic workaround, Hono doesn't pass parent route params to nested apps)
- [x] Phase 03: Add `PUT /:number/pages` endpoint for replacing chapter pages
- [x] Phase 03: Add `?language=` query param to `GET /:number` endpoint, default 'en'
- [x] Phase 04: Update dependency to require Phase 01 + Phase 02
- [x] Phase 04: Replace URL pathname parsing with Hono param approach — **KEPT** URL parsing (same reason as Phase 03)
- [x] plan.md: Dependency graph updated (Phase 04 depends on 01 + 02)

## Code Review Follow-up

**Reviewed**: 2026-02-06 18:56
**Report**: `plans/reports/code-reviewer-260206-1856-phase4-chapters-volumes.md`

**High priority fixes**:
1. Add transaction to PUT /:number/pages endpoint (chapters.ts:230-246) — prevents partial failures

**Medium priority**:
2. Document pagination/sort inconsistency or add volumeQueryParamsSchema
3. Improve type cast in chapter-helpers.ts:92,105 — validate language before query

**Low priority**:
4. Add rate limiting (production concern)
5. Add structured logging for auth failures
6. Run pnpm audit for dependency vulnerabilities

**Security**: ✅ No critical issues. SQL injection protected by Drizzle ORM + Zod validation. Auth middleware covers all write ops.
