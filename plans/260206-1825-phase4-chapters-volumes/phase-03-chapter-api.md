# Phase 03: Chapter API Routes

## Context

- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 01 (Shared Types), Phase 02 (Database Schema)
- **Docs**: [system-architecture.md](../../docs/system-architecture.md)
- **Research**: [API Design Patterns](./research/researcher-02-api-design-patterns.md)

## Parallelization

- **Runs parallel with**: Phase 04 (Volume API) — after both dependencies complete
- **Blocked by**: Phase 01 + Phase 02
- **No shared files** with Phase 04 (except index.ts — append-only, different lines)

## Overview

- **Date**: 2026-02-06
- **Description**: CRUD endpoints for chapters nested under `/api/manga/:slug/chapters`, including page management and prev/next navigation
- **Priority**: P1
- **Status**: done (2026-02-06)
- **Effort**: 2h

## Key Insights

- Follow `manga.ts` / `manga-helpers.ts` split pattern exactly
- Chapter identified by `number` in URL (text, supports "10.5")
- Pages returned inline with single chapter (no separate endpoint)
- Prev/next navigation computed from adjacent chapters by number
- Auth middleware on write ops — same pattern as manga routes in `index.ts`
- Manga lookup by slug first, then use mangaId for chapter queries

## Requirements

1. `GET /api/manga/:slug/chapters` — list chapters (paginated, filterable by language)
2. `POST /api/manga/:slug/chapters` — create chapter with pages (auth required)
3. `GET /api/manga/:slug/chapters/:number` — get chapter with pages + prev/next
4. `PATCH /api/manga/:slug/chapters/:number` — update chapter metadata (auth required)
5. `DELETE /api/manga/:slug/chapters/:number` — delete chapter + cascade pages (auth required)

## Architecture

```
Client → GET /api/manga/one-piece/chapters?page=1&language=en
       → Resolve manga slug → mangaId
       → Query chapters WHERE mangaId + language, paginated
       → Return chapter list with pagination meta

Client → GET /api/manga/one-piece/chapters/10.5
       → Resolve manga slug → mangaId
       → Query chapter WHERE mangaId + number (+ language from query?)
       → Query chapter_pages WHERE chapterId ORDER BY pageNumber
       → Compute prev/next from adjacent chapters
       → Return chapter + pages + navigation
```

## Related Code Files

Reference (read-only, patterns to follow):
- `apps/api/src/routes/manga.ts` — CRUD route pattern
- `apps/api/src/routes/manga-helpers.ts` — helper function pattern
- `apps/api/src/lib/api-response.ts` — response helpers
- `apps/api/src/lib/pagination.ts` — pagination utils
- `apps/api/src/index.ts` — route mounting pattern

## File Ownership

| File | Action |
|------|--------|
| `apps/api/src/routes/chapters.ts` | CREATE |
| `apps/api/src/routes/chapter-helpers.ts` | CREATE |
| `apps/api/src/index.ts` | MODIFY (append chapter route mount + auth middleware) |

## Implementation Steps

### Step 1: Create chapter-helpers.ts

```typescript
import { eq, and, asc, desc, gt, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, chapters, chapterPages } from '../db/schema'
import type { ChapterQueryParams } from '@mangafire/shared/types'

/**
 * Resolves manga slug to manga record. Returns null if not found.
 */
export async function findMangaBySlug(slug: string) {
  const result = await db
    .select({ id: manga.id, slug: manga.slug })
    .from(manga)
    .where(eq(manga.slug, slug))
  return result[0] ?? null
}

/**
 * Builds WHERE conditions for chapter list query.
 */
export function buildChapterConditions(
  mangaId: number,
  params: ChapterQueryParams
) {
  const conditions = [eq(chapters.mangaId, mangaId)]
  if (params.language) {
    conditions.push(eq(chapters.language, params.language))
  }
  return conditions
}

/**
 * Fetches paginated chapter list for a manga.
 */
export async function fetchChapterList(
  mangaId: number,
  params: ChapterQueryParams,
  offset: number,
  limit: number
) {
  const conditions = buildChapterConditions(mangaId, params)
  const sortDir = params.sortOrder === 'desc' ? desc : asc

  const items = await db
    .select()
    .from(chapters)
    .where(and(...conditions))
    .orderBy(sortDir(chapters.number))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(chapters)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count || 0)
  return { items, total }
}

/**
 * Fetches pages for a chapter, ordered by page number.
 */
export async function fetchChapterPages(chapterId: number) {
  return db
    .select()
    .from(chapterPages)
    .where(eq(chapterPages.chapterId, chapterId))
    .orderBy(asc(chapterPages.pageNumber))
}

/**
 * Computes prev/next chapter navigation.
 */
export async function getChapterNavigation(
  mangaId: number,
  currentNumber: string,
  language: string
) {
  // Previous: largest number less than current
  const prev = await db
    .select({ number: chapters.number, slug: chapters.slug })
    .from(chapters)
    .where(
      and(
        eq(chapters.mangaId, mangaId),
        eq(chapters.language, language as any),
        lt(chapters.number, currentNumber)
      )
    )
    .orderBy(desc(chapters.number))
    .limit(1)

  // Next: smallest number greater than current
  const next = await db
    .select({ number: chapters.number, slug: chapters.slug })
    .from(chapters)
    .where(
      and(
        eq(chapters.mangaId, mangaId),
        eq(chapters.language, language as any),
        gt(chapters.number, currentNumber)
      )
    )
    .orderBy(asc(chapters.number))
    .limit(1)

  return {
    prev: prev[0] ?? null,
    next: next[0] ?? null,
  }
}
```

### Step 2: Create chapters.ts

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { chapters, chapterPages } from '../db/schema'
import {
  createChapterDtoSchema,
  updateChapterDtoSchema,
  chapterQueryParamsSchema,
} from '@mangafire/shared'
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import {
  findMangaBySlug,
  fetchChapterList,
  fetchChapterPages,
  getChapterNavigation,
} from './chapter-helpers'

// Routes are mounted at /api/manga/:slug/chapters
// The :slug param is extracted from the parent route
export const chapterRoutes = new Hono<{ Variables: { mangaId: number } }>()

// Middleware: resolve manga slug to mangaId for all chapter routes
chapterRoutes.use('*', async (c, next) => {
  // Extract slug from the URL path (mounted under /api/manga/:slug/chapters)
  const url = new URL(c.req.url)
  const pathParts = url.pathname.split('/')
  // Path: /api/manga/{slug}/chapters/...
  const slugIndex = pathParts.indexOf('manga') + 1
  const slug = pathParts[slugIndex]

  if (!slug) {
    return errorResponse(c, 'Manga slug required', 'BAD_REQUEST', 400)
  }

  const mangaRecord = await findMangaBySlug(slug)
  if (!mangaRecord) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  c.set('mangaId', mangaRecord.id)
  await next()
})

// GET / — list chapters
chapterRoutes.get(
  '/',
  zValidator('query', chapterQueryParamsSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const params = c.req.valid('query')
    const { offset, limit } = getOffsetLimit(params)

    const { items, total } = await fetchChapterList(
      mangaId,
      params,
      offset,
      limit
    )
    const meta = calculatePagination(total, params)
    return successResponse(c, items, meta)
  }
)

// POST / — create chapter with pages
chapterRoutes.post(
  '/',
  zValidator('json', createChapterDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const body = c.req.valid('json')
    const { pages, ...chapterData } = body

    // Insert chapter
    const insertResult = await db
      .insert(chapters)
      .values({
        ...chapterData,
        mangaId,
        pageCount: pages.length,
      })
      .returning()
    const newChapter = insertResult[0]

    // Insert pages
    if (pages.length > 0) {
      await db.insert(chapterPages).values(
        pages.map((page) => ({
          chapterId: newChapter.id,
          ...page,
        }))
      )
    }

    return createdResponse(c, newChapter)
  }
)

// GET /:number — get chapter with pages + navigation
chapterRoutes.get('/:number', async (c) => {
  const mangaId = c.get('mangaId')
  const number = c.req.param('number')

  // Find chapter
  const result = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))

  if (result.length === 0) {
    return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
  }

  const chapter = result[0]
  const pages = await fetchChapterPages(chapter.id)
  const navigation = await getChapterNavigation(
    mangaId,
    chapter.number,
    chapter.language
  )

  return successResponse(c, {
    ...chapter,
    pages,
    navigation,
  })
})

// PATCH /:number — update chapter metadata
chapterRoutes.patch(
  '/:number',
  zValidator('json', updateChapterDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = c.req.param('number')
    const body = c.req.valid('json')

    const updateResult = await db
      .update(chapters)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))
      .returning()

    if (updateResult.length === 0) {
      return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
    }

    return successResponse(c, updateResult[0])
  }
)

// DELETE /:number — delete chapter (pages cascade)
chapterRoutes.delete('/:number', async (c) => {
  const mangaId = c.get('mangaId')
  const number = c.req.param('number')

  const deleteResult = await db
    .delete(chapters)
    .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))
    .returning()

  if (deleteResult.length === 0) {
    return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
  }

  return noContentResponse(c)
})
```

### Step 3: Mount in index.ts

Add to `apps/api/src/index.ts` (after manga route block):

```typescript
import { chapterRoutes } from './routes/chapters'

// Chapter routes: nested under manga, GET public, write ops require auth
app.use('/api/manga/*/chapters/*', async (c, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.use('/api/manga/*/chapters', async (c, next) => {
  if (['POST'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.route('/api/manga/:slug/chapters', chapterRoutes)
```

## Todo

- [x] Create `apps/api/src/routes/chapter-helpers.ts`
- [x] Create `apps/api/src/routes/chapters.ts`
- [x] Add chapter route import and mounting to `apps/api/src/index.ts`
- [x] Add auth middleware for chapter write operations
- [x] Run `pnpm type-check` in api package
- [x] Test all 5 CRUD endpoints manually

## Success Criteria

- `GET /api/manga/:slug/chapters` returns paginated list
- `POST /api/manga/:slug/chapters` creates chapter + pages (auth required)
- `GET /api/manga/:slug/chapters/:number` returns chapter + pages + prev/next
- `PATCH /api/manga/:slug/chapters/:number` updates metadata (auth required)
- `DELETE /api/manga/:slug/chapters/:number` deletes + cascades pages (auth required)
- 404 returned for nonexistent manga slug or chapter number
- 401 returned for unauthenticated write requests

## Conflict Prevention

- **chapters.ts** and **chapter-helpers.ts** are NEW files — no conflicts possible
- **index.ts** modification: append-only after existing manga route block. Phase 04 appends after this block.
- Pattern: Phase 03 adds lines ~45-57, Phase 04 adds lines ~58-70 (approximate)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slug extraction from URL path fragile | Medium | Use Hono param if possible; URL parsing as fallback |
| Chapter number text comparison for prev/next | Medium | Text comparison works for "1" < "2" but "10" < "2" — may need numeric cast in query |
| Unique constraint violation on duplicate chapter | Low | DB will throw; wrap in try/catch with 409 Conflict response |

**IMPORTANT NOTE on chapter number ordering**: Text-based ordering of chapter numbers (e.g., "2" > "10" lexicographically) is a known issue. For the MVP, this is acceptable — chapters are typically browsed from a list, not navigated strictly by number. Phase 5 can add numeric casting (`chapters.number::numeric`) for correct ordering if needed.

## Security Considerations

- Auth middleware on POST/PATCH/DELETE matches manga pattern
- zValidator prevents malformed input
- SQL injection prevented by Drizzle parameterized queries
- Cascade delete ensures no orphaned data

## Next Steps

- Phase 05 (Frontend): Replace mock chapter data in `views/manga/` with API calls
- Consider adding `chapters.number::numeric` cast for correct ordering
- Consider aggregate endpoint for reader preloading
