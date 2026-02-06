---
title: "Manga CRUD API Routes"
description: "Build manga CRUD API routes with Hono + Drizzle ORM, including database schema, validation, error handling, and RESTful endpoints"
status: done
priority: P1
effort: 6h
branch: main
tags: [api, crud, drizzle, hono, postgres]
created: 2026-02-06
reviewed: 2026-02-06
---

## Code Review Status

**Review Date**: 2026-02-06
**Review Report**: `plans/reports/code-reviewer-260206-1641-manga-crud-api.md`
**Overall Score**: 7.5/10
**Build Status**: ✅ Passes (type-check + lint clean)

**BLOCKERS (Must Fix Before Merge)**:
- 🔴 SQL injection vulnerability in search (CRITICAL)
- 🔴 Missing auth TODO comments (deploy blocker)
- ⚠️ No seed script for genres (plan requirement)

**Action Required**: Fix critical issues, implement seed script, then re-review security.

## Objective

Implement core manga CRUD functionality in `apps/api` with:
- PostgreSQL schema (manga, genres, manga_genres tables)
- RESTful API endpoints (list, get, create, update, delete)
- Shared types/validators in `packages/shared`
- Centralized error handling and response utilities
- Pagination and filtering support

**Deferred**: Chapters, volumes, pages (future plan)

## Dependency Graph

```
Phase 01 (DB Schema) ────┐
                          ├──→ Phase 04 (Route Handlers)
Phase 02 (Shared Types) ─┤
                          │
Phase 03 (Infrastructure)┘
```

**Parallel phases**: 01, 02, 03 (no file conflicts)
**Sequential phase**: 04 (depends on 01, 02, 03)

## File Ownership Matrix

| Phase | Files Modified/Created | Conflict Risk |
|-------|------------------------|---------------|
| 01 | `apps/api/src/db/schema.ts` (replace), `apps/api/drizzle/*.sql` (generated) | None |
| 02 | `packages/shared/src/types/{api,manga}.ts`, `packages/shared/src/validators/{manga,api}.ts`, `packages/shared/src/{types,validators}/index.ts` | None |
| 03 | `apps/api/src/middleware/error-handler.ts` (new), `apps/api/src/lib/{api-response,pagination}.ts` (new) | None |
| 04 | `apps/api/src/routes/{manga,genres}.ts` (new), `apps/api/src/index.ts` (mount), `apps/api/package.json` (add deps) | None |

## Phase Summaries

### Phase 01: Database Schema & Migrations (1.5h)
- Replace placeholder schema with manga, genres, manga_genres tables
- Add Drizzle relations for type-safe joins
- Generate and apply migrations
- **Independent**: No dependencies on other phases

### Phase 02: Shared Types & Validators (1.5h)
- Create API response/pagination types
- Add manga CRUD DTOs (CreateManga, UpdateManga, MangaQueryParams)
- Define enums (MangaStatus, MangaType, Language)
- Write Zod validators for all DTOs
- **Independent**: No dependencies on other phases

### Phase 03: API Infrastructure (1h)
- Build error handler middleware (HTTPException, ZodError, DB errors)
- Create API response helpers (success/error wrappers)
- Write pagination utility (offset-based with metadata)
- **Independent**: No dependencies on other phases

### Phase 04: Manga Route Handlers (2h)
- Install `@hono/zod-validator`
- Implement manga CRUD handlers (list, getBySlug, create, update, delete)
- Implement genres list handler
- Mount routes in `index.ts`
- **Sequential**: Depends on phases 01, 02, 03

## Success Criteria

- [x] DB schema with 3 tables (manga, genres, manga_genres) and relations
- [x] 5 manga endpoints: `GET /api/manga`, `GET /api/manga/:slug`, `POST /api/manga`, `PATCH /api/manga/:slug`, `DELETE /api/manga/:slug`
- [x] 1 genres endpoint: `GET /api/genres`
- [x] Zod validation on all input DTOs
- [x] Paginated manga list with filtering by status/type/genre
- [x] Centralized error handling with proper HTTP status codes
- [x] Type-safe API responses with `ApiResponse<T>` wrapper
- [ ] All tests pass: manual Postman/curl testing for each endpoint (not documented)
- [ ] **BLOCKER**: Fix SQL injection in search query
- [ ] **BLOCKER**: Add seed script for genres

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phase 04 blocked if 01/02/03 have issues | High | Clear success criteria per phase, early validation |
| Drizzle ORM version mismatch (0.29.x) | Medium | Use exact patterns from research reports |
| Slug uniqueness conflicts | Medium | Add unique index, handle DB errors in error handler |
| Missing env vars (DATABASE_URL) | Low | Document in phase 01, add validation |

## Related Documentation

- Research: `planner-260206-1530-hono-drizzle-crud.md`
- Research: `planner-260206-1550-manga-data-model.md`
- Workflows: `$HOME/.claude/workflows/development-rules.md`
- Codebase: `apps/api/src/`, `packages/shared/src/`

## Phase Execution Order

1. **Start phases 01, 02, 03 in parallel** (assign to 3 different agents/sessions)
2. **Verify all 3 complete successfully** (check migrations applied, types compile, utils tested)
3. **Start phase 04** (assign to single agent with full context from phases 01-03)
4. **Final integration test** (run all endpoints, verify DB state)

## Validation Summary

**Validated:** 2026-02-06
**Questions asked:** 7

### Confirmed Decisions
- **Primary Key**: `serial` (auto-increment) — simple, Drizzle 0.29.x compatible
- **Author/Artist Model**: Text fields on manga table — sufficient for MVP
- **Delete Mode**: Hard delete — no soft delete complexity needed
- **Authentication**: No auth for MVP — all endpoints public, auth deferred
- **Search**: ILIKE pattern matching on title — simple, adequate for MVP
- **Seed Data**: Add seed script for genres — needed for testing (add to Phase 01)
- **Identifier**: Slug for all endpoints — consistent, SEO-friendly

### Action Items
- [ ] Add genres seed script to Phase 01 scope (seed.ts with common manga genres)
- [x] Ensure POST response includes slug (not just id)
- [ ] Document auth as mandatory TODO before production in plan

---

## Implementation Status

**Phase 01-04**: ✅ Complete (all code delivered)
**Review**: ⚠️ In Progress (critical issues found)
**Next Steps**:
1. Fix SQL injection vulnerability in `manga-helpers.ts:18`
2. Implement seed script (`apps/api/src/db/seed.ts`)
3. Add auth placeholder comments in `index.ts`
4. Use `errorResponse` helper consistently in all routes
5. Re-review security before merge
