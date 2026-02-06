# Code Review: Manga CRUD API Implementation

**Review Date**: 2026-02-06
**Reviewer**: code-reviewer (Claude Sonnet 4.5)
**Branch**: main (uncommitted)
**Commit**: 669a494 (base)

---

## Scope

### Files Reviewed
**New Files (11):**
- `apps/api/src/lib/api-response.ts` — response helpers
- `apps/api/src/lib/pagination.ts` — pagination utils
- `apps/api/src/middleware/error-handler.ts` — global error handler
- `apps/api/src/routes/manga.ts` — manga CRUD routes (175 lines)
- `apps/api/src/routes/manga-helpers.ts` — query builders (162 lines)
- `apps/api/src/routes/genres.ts` — genre routes
- `packages/shared/src/types/api.ts` — API response types
- `packages/shared/src/validators/api.ts` — pagination validators
- `apps/api/drizzle/0000_brave_roland_deschain.sql` — DB migration

**Modified Files (9):**
- `apps/api/src/db/schema.ts` — added 3 tables, enums, relations
- `apps/api/src/index.ts` — mounted manga/genre routes
- `apps/api/package.json` — added `@hono/zod-validator`
- `packages/shared/src/types/manga.ts` — added CRUD types, enums, DTOs
- `packages/shared/src/validators/manga.ts` — added CRUD validators
- `packages/shared/src/types/index.ts` — export manga types
- `packages/shared/src/validators/index.ts` — export manga validators
- `apps/api/drizzle.config.ts` — (minor)
- `pnpm-lock.yaml` — dependency updates

**Lines Analyzed**: ~850 (new code only)

**Review Focus**: Recent changes for Manga CRUD API (Phase 01-04 complete)

**Updated Plans**: None (plan file exists but not tracked in git yet)

---

## Overall Assessment

**Code Quality**: 7.5/10

**Summary**: Implementation is solid with good separation of concerns, proper validation, type safety, and error handling. Build succeeds, type checking passes, linting clean. However, **CRITICAL SQL injection vulnerability** in search functionality must be fixed immediately. Several other issues around security headers, missing indexes, and incomplete error handling.

**Strengths**:
- Clean Drizzle schema with proper indexes, relations, unique constraints
- Comprehensive Zod validators with strong input validation
- Centralized error handling with proper HTTP status codes
- Type-safe response wrappers using shared types
- Good code organization (helpers separated from routes)
- Pagination implemented correctly with offset/limit
- DB cascading deletes configured properly

**Weaknesses**:
- **SQL injection vulnerability in search** (CRITICAL)
- Missing rate limiting, authentication placeholder
- No CORS origin validation against allowlist
- Missing slug index for manga_genres table
- Inconsistent error response format (some routes bypass helpers)
- No seed data for genres (plan requirement)
- Insufficient logging for debugging

---

## CRITICAL Issues (MUST FIX)

### 🔴 SQL Injection in Search
**File**: `apps/api/src/routes/manga-helpers.ts:18`

**Issue**: User input directly interpolated into ILIKE pattern without escaping:
```typescript
if (params.search) {
  conditions.push(ilike(manga.title, `%${params.search}%`))
}
```

**Risk**: Attacker can inject SQL wildcards (%, _) to perform expensive full table scans or extract data.

**Example Attack**:
```
GET /api/manga?search=%25%25%25%25%25%25  (100% wildcard search)
```

**Fix**:
```typescript
if (params.search) {
  // Escape special characters % and _
  const sanitized = params.search.replace(/[%_]/g, '\\$&')
  conditions.push(ilike(manga.title, `%${sanitized}%`))
}
```

**OR** use parameterized binding if Drizzle supports it:
```typescript
conditions.push(sql`${manga.title} ILIKE '%' || ${params.search} || '%'`)
```

---

### 🔴 Missing Authentication Layer
**Files**: All route files, `apps/api/src/index.ts`

**Issue**: All endpoints are publicly accessible. No auth middleware, no ownership checks.

**Risk**: Anyone can create/update/delete manga without authorization.

**Note**: Plan document mentions "No auth for MVP — all endpoints public, auth deferred". This is acceptable for local dev but **MUST NOT** deploy to production.

**Action Required**:
- Add TODO comment in `index.ts` with blocker warning
- Document in README that this is MVP-only
- Add auth middleware placeholder in code structure

---

## High Priority Findings

### ⚠️ CORS Origin Not Validated
**File**: `apps/api/src/index.ts:18`

```typescript
origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
```

**Issue**: Single origin hardcoded. Production needs multiple origins (web, mobile) and validation.

**Risk**: If `CORS_ORIGIN` is misconfigured (e.g., `*`), exposes API to any domain.

**Fix**:
```typescript
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
app.use('/api/*', cors({
  origin: (origin) => allowedOrigins.includes(origin || ''),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))
```

---

### ⚠️ Missing Index on Slug Search
**File**: `apps/api/src/db/schema.ts:71`

**Issue**: Manga-genres junction table has indexes on FKs but not on composite lookup:
```typescript
mangaIdIdx: index('manga_genres_manga_id_idx').on(table.mangaId),
genreIdIdx: index('manga_genres_genre_id_idx').on(table.genreId),
```

**Impact**: Query `GET /api/manga?genreId=5` joins on `manga_genres.genre_id` (indexed ✅) but fetching multiple manga by slug requires sequential lookups (no slug index on junction).

**Recommendation**: Add compound index for genre filtering performance:
```typescript
genreFilterIdx: index('manga_genres_genre_manga_idx').on(table.genreId, table.mangaId),
```

---

### ⚠️ Error Response Inconsistency
**Files**: `apps/api/src/routes/manga.ts:68-74, 126-132, 164-170`

**Issue**: Manual error responses instead of using `errorResponse` helper:
```typescript
return c.json(
  {
    success: false,
    error: { message: 'Manga not found' },
  },
  404
)
```

**Impact**: Inconsistent error format (missing `code` field), harder to maintain.

**Fix**: Use helper everywhere:
```typescript
return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
```

---

### ⚠️ Type Coercion Weakness
**File**: `packages/shared/src/validators/manga.ts:68-76`

**Issue**: `z.coerce.number()` on query params can silently convert invalid input:
```typescript
page: z.coerce.number().int().positive().default(1),
genreId: z.coerce.number().int().positive().optional(),
```

**Example**: `?page=abc` → `NaN` → fails `.positive()` ✅
But: `?genreId=5.7` → `5` (silently truncated by `.int()`)

**Recommendation**: Use explicit validation with better error messages:
```typescript
page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default(1),
```

---

### ⚠️ Foreign Key Error Handling Too Generic
**File**: `apps/api/src/middleware/error-handler.ts:56-67`

```typescript
if (err.message.toLowerCase().includes('foreign key constraint')) {
  return c.json(
    {
      success: false,
      error: {
        message: 'Referenced resource not found',
        code: 'FOREIGN_KEY_VIOLATION',
      },
    },
    400
  )
}
```

**Issue**: Doesn't distinguish between:
- Invalid `genreIds` in POST (user error → 400) ✅
- Broken referential integrity (system error → 500) ❌

**Impact**: 400 response for system-level FK violations misleads clients.

**Fix**: Parse error message to identify constraint name, return 500 for unexpected violations.

---

### ⚠️ Missing Database Connection Error Handling
**File**: `apps/api/src/db/client.ts`

**Issue**: No try-catch around `postgres()` connection, no health check before queries.

**Risk**: If DB is down, server crashes on first query instead of returning 503.

**Fix**: Add connection test in startup:
```typescript
try {
  await client`SELECT 1`
  console.log('Database connected')
} catch (err) {
  console.error('Database connection failed:', err)
  process.exit(1)
}
```

---

### ⚠️ Missing Rate Limiting
**File**: `apps/api/src/index.ts`

**Issue**: No rate limiting middleware. Search endpoint (`GET /api/manga?search=`) is expensive.

**Risk**: DoS via repeated ILIKE queries.

**Recommendation**: Add `hono-rate-limiter` middleware:
```typescript
import { rateLimiter } from 'hono-rate-limiter'
app.use('/api/*', rateLimiter({ windowMs: 60000, max: 100 }))
```

---

## Medium Priority Improvements

### 📋 No Seed Data for Genres
**Status**: Plan requires seed script (`plan.md:122`), not implemented.

**Impact**: Cannot test manga creation with `genreIds` without manual DB inserts.

**Fix**: Add `apps/api/src/db/seed.ts`:
```typescript
import { db } from './client'
import { genres } from './schema'

const defaultGenres = [
  { name: 'Action', slug: 'action', description: 'Action and combat' },
  { name: 'Romance', slug: 'romance', description: 'Love stories' },
  // ... 15-20 common genres
]

await db.insert(genres).values(defaultGenres).onConflictDoNothing()
```

Add script: `"db:seed": "tsx src/db/seed.ts"` in `package.json`.

---

### 📋 Pagination Meta Can Be Confusing
**File**: `apps/api/src/lib/pagination.ts:14`

```typescript
const pages = total === 0 ? 0 : Math.ceil(total / limit)
```

**Issue**: Edge case handling is correct (0 pages when empty), but returning `page: 1, pages: 0` is semantically odd.

**Recommendation**: Normalize to `page: 0, pages: 0` when total is 0, or add comment explaining intent.

---

### 📋 Genre Name Not Validated
**File**: `packages/shared/src/validators/manga.ts:49`

**Issue**: `genreIds` validated as positive integers, but no check if genres exist.

**Impact**: FK constraint violation returns generic 400 error, not user-friendly.

**Fix Option 1**: Validate in route handler (query DB for genre existence).
**Fix Option 2**: Rely on FK error, but improve error message (see "Foreign Key Error Handling").

---

### 📋 Missing Slug Auto-Generation
**File**: `apps/api/src/routes/manga.ts:89-95`

**Issue**: Slug must be manually provided in POST body. Common pattern is auto-generate from title.

**Example Fix**:
```typescript
import slugify from 'slugify'
const slug = body.slug || slugify(body.title, { lower: true, strict: true })
```

Add to validator:
```typescript
slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
```

---

### 📋 No Duplicate Slug Handling
**File**: `apps/api/src/middleware/error-handler.ts:42-53`

**Issue**: Unique constraint violation returns generic "Resource already exists". User doesn't know it's the slug.

**Fix**: Parse PostgreSQL error detail:
```typescript
if (err.message.includes('manga_slug_unique')) {
  return c.json({ success: false, error: { message: 'Slug already exists', code: 'DUPLICATE_SLUG' } }, 409)
}
```

---

### 📋 UpdatedAt Not Auto-Updated
**File**: `apps/api/src/db/schema.ts:39,61`

**Issue**: Schema has `updatedAt` with `defaultNow()`, but Drizzle doesn't auto-update on PATCH.

**Current Fix**: Manual update in route handler (`manga.ts:138-141`) ✅

**Recommendation**: Document this behavior in schema comment (Drizzle doesn't support `ON UPDATE CURRENT_TIMESTAMP` triggers).

---

### 📋 No Logging for Queries
**File**: `apps/api/src/routes/manga-helpers.ts`

**Issue**: No query logging for debugging slow searches or failed operations.

**Impact**: Hard to diagnose production issues without logs.

**Fix**: Add Drizzle logger:
```typescript
export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})
```

---

### 📋 Search Limited to Title Only
**File**: `apps/api/src/routes/manga-helpers.ts:17-19`

**Issue**: ILIKE only matches `title`, not `alternative_titles`, `author`, or `description`.

**Impact**: Limited discoverability (e.g., searching by Japanese title won't work if it's in `alternative_titles`).

**Recommendation**: Add full-text search or expand ILIKE:
```typescript
if (params.search) {
  const sanitized = params.search.replace(/[%_]/g, '\\$&')
  conditions.push(
    or(
      ilike(manga.title, `%${sanitized}%`),
      ilike(manga.author, `%${sanitized}%`),
      // For arrays: sql`${manga.alternativeTitles}::text ILIKE '%${sanitized}%'`
    )
  )
}
```

---

## Low Priority Suggestions

### 💡 Type Assertion in Response Helpers
**File**: `apps/api/src/lib/api-response.ts:19,39`

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
return c.json(response, status as any)
```

**Issue**: Hono's `c.json()` expects specific status codes (e.g., `200 | 201 | 400`). Disabling with `as any` is pragmatic but loses type safety.

**Recommendation**: Define a union type for valid statuses:
```typescript
type HttpStatus = 200 | 201 | 204 | 400 | 404 | 409 | 500
return c.json(response, status as HttpStatus)
```

Or use Hono's `StatusCode` type if available in v4.0.

---

### 💡 Magic Numbers in Validators
**File**: `packages/shared/src/validators/manga.ts:38-48`

```typescript
title: z.string().min(1).max(500),
slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
description: z.string().max(5000).optional(),
```

**Recommendation**: Extract to constants:
```typescript
const MANGA_LIMITS = {
  TITLE_MAX: 500,
  SLUG_MAX: 200,
  DESCRIPTION_MAX: 5000,
} as const
```

---

### 💡 Regex Error Message Not User-Friendly
**File**: `packages/shared/src/validators/manga.ts:39`

```typescript
slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
```

**Good**: Custom error message ✅
**Improvement**: Explain format (e.g., "Slug must be lowercase alphanumeric with hyphens (e.g., 'one-piece')").

---

### 💡 No Enum Validation for Search SortBy
**File**: `packages/shared/src/validators/manga.ts:74`

```typescript
sortBy: z.enum(['rating', 'views', 'createdAt', 'title']).default('createdAt'),
```

**Issue**: TypeScript enum exists (`MangaQueryParams.sortBy`), but validator hardcodes strings.

**Recommendation**: Create Zod enum from TS union:
```typescript
const SORT_FIELDS = ['rating', 'views', 'createdAt', 'title'] as const
export const sortBySchema = z.enum(SORT_FIELDS).default('createdAt')
```

---

### 💡 Consider Adding Genre Description to List Response
**File**: `apps/api/src/routes/manga-helpers.ts:130-140`

**Issue**: `fetchMangaGenres` returns `id, name, slug` but not `description`.

**Impact**: Frontend must make separate genre API call to show descriptions.

**Recommendation**: Add `description` to select, or document as intentional (keep response small).

---

### 💡 No Healthcheck for Database
**File**: `apps/api/src/routes/health.ts` (not shown in files, but likely exists)

**Issue**: Healthcheck probably returns 200 without checking DB connectivity.

**Recommendation**: Add DB ping:
```typescript
try {
  await db.select().from(genres).limit(1) // Quick query
  return c.json({ status: 'healthy', db: 'connected' })
} catch {
  return c.json({ status: 'unhealthy', db: 'disconnected' }, 503)
}
```

---

## Positive Observations

✅ **Excellent Schema Design**: Proper use of enums, indexes, foreign keys, cascading deletes.
✅ **Strong Input Validation**: Zod schemas are comprehensive (max lengths, regex, enums).
✅ **Type Safety**: Full end-to-end TypeScript types from DB → API → shared package.
✅ **Clean Code Structure**: Helpers separated from routes, no fat controllers.
✅ **Pagination Metadata**: Correct calculation including edge case (total = 0).
✅ **Genre Filtering**: Efficient join-based query (not N+1).
✅ **Error Boundary**: Global error handler catches all unhandled errors.
✅ **Build Success**: TypeScript compiles, linting passes, no runtime errors in basic tests.

---

## Recommended Actions

**Immediate (Pre-Merge)**:
1. ✅ **[BLOCKER]** Fix SQL injection in search (sanitize `params.search`) — 5 min
2. ✅ **[BLOCKER]** Add TODO comments for missing auth — 2 min
3. ✅ Use `errorResponse` helper in all routes (consistency) — 10 min
4. ✅ Add CORS allowlist validation — 10 min
5. ✅ Add DB connection health check in `client.ts` — 10 min

**Short-Term (Next Sprint)**:
6. 🔶 Implement seed script for genres — 30 min
7. 🔶 Add rate limiting middleware — 15 min
8. 🔶 Improve FK error messages (parse constraint name) — 20 min
9. 🔶 Add query logging in dev mode — 5 min
10. 🔶 Expand search to alternative titles/author — 20 min

**Long-Term (Pre-Production)**:
11. 🔷 Implement authentication + authorization layer
12. 🔷 Add full-text search (PostgreSQL `tsvector`)
13. 🔷 Implement soft delete (if required by product)
14. 🔷 Add OpenAPI/Swagger documentation
15. 🔷 Add integration tests (Vitest + Supertest)

---

## Metrics

- **Type Coverage**: 100% (all files typed, no `any` except pragmatic helpers)
- **Test Coverage**: 0% (no tests written yet, manual testing only)
- **Linting Issues**: 0 (ESLint clean)
- **Build Status**: ✅ Passes (`pnpm build` successful)
- **Critical Vulnerabilities**: 1 (SQL injection)
- **High Priority Issues**: 7
- **Medium Priority Issues**: 9
- **Low Priority Issues**: 6

---

## Plan Completeness Check

**Plan File**: `/Users/jhin1m/Desktop/ducanh-project/mangafire/plans/260206-1614-manga-crud-api/plan.md`

### Success Criteria Review

| Criterion | Status | Notes |
|-----------|--------|-------|
| DB schema with 3 tables + relations | ✅ DONE | `schema.ts:33-109`, migration applied |
| 5 manga endpoints | ✅ DONE | GET (list), GET (slug), POST, PATCH, DELETE |
| 1 genres endpoint | ✅ DONE | GET /api/genres |
| Zod validation on inputs | ✅ DONE | All DTOs validated |
| Paginated manga list with filters | ✅ DONE | status, type, genreId, search, sortBy |
| Centralized error handling | ✅ DONE | `error-handler.ts`, proper HTTP codes |
| Type-safe responses | ✅ DONE | `ApiResponse<T>` wrapper |
| Manual endpoint testing | ⚠️ PARTIAL | Not documented in plan reports |

### Action Items (from plan.md:121-124)

| Item | Status | Notes |
|------|--------|-------|
| Add genres seed script | ❌ TODO | Required but missing |
| Ensure POST response includes slug | ✅ DONE | `manga.ts:107` returns full object with slug |
| Document auth as mandatory TODO | ⚠️ PARTIAL | Not added to README/code comments |

### Overall Plan Status

**Phases 01-04**: ✅ Complete (code delivered)
**Success Criteria**: 90% met (1 missing: seed script)
**Blockers**: SQL injection must be fixed before production

**Recommendation**: Mark plan as "needs revision" to add:
- Security fixes (SQL injection, auth placeholders)
- Seed script implementation
- Testing documentation

---

## Unresolved Questions

1. **Genre Seeding**: Plan requires seed script. Should it run automatically in `db:push` or be manual (`pnpm db:seed`)?

2. **Auth Strategy**: Plan defers auth. What's the target implementation (JWT, session, OAuth)? Affects API design (e.g., ownership fields).

3. **Search Performance**: ILIKE is slow on large datasets. Is full-text search (PostgreSQL `tsvector`) in roadmap?

4. **Soft Delete**: Plan says hard delete is sufficient. Is there a product requirement for manga restoration?

5. **API Versioning**: Current routes are `/api/manga`. Should we version (`/api/v1/manga`) for future breaking changes?

6. **File Uploads**: `coverImage` is a text URL. Is there a separate file upload service, or should API handle this?

7. **Manga Slug Conflicts**: If title "One Piece" exists and user creates another, should API auto-append suffix (e.g., `one-piece-2`)?

8. **Genre Management**: No CRUD for genres (only GET). Is genre creation admin-only, or deferred to future plan?

---

**Review Completed**: 2026-02-06 16:41
**Next Reviewer Action**: Address CRITICAL issues, then re-review security before merge.
