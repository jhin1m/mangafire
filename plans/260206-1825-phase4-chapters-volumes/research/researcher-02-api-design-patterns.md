# REST API Design Patterns for Manga Chapter/Volume Management

**Research Date:** 2026-02-06
**Context:** Hono + Drizzle ORM + Zod, nested under `/api/manga`, slug-based IDs, auth middleware on write ops

---

## 1. API Endpoint Design for Nested Resources

### Slug vs Number vs ID in URLs

**Recommendation: Hybrid approach** — use **slugs externally** for human-readable URLs, **IDs internally** for stability.

- **Slugs** are perfect for humans: SEO-friendly, shareable, descriptive (`/manga/one-piece/chapter/1045`)
- **IDs** are perfect for machines: stable when titles change, unambiguous, database-native
- Best APIs use both: accept slugs in URLs, maintain slug history table with 301 redirects when slugs change

**For manga chapters:**
- Primary endpoint: `/api/manga/{manga-slug}/chapters/{chapter-number}` (e.g., `/manga/one-piece/chapters/10.5`)
- Alternative: `/api/chapters/{chapter-id}` for internal references
- Chapter numbers support decimals (10.5, 10.1) — sort lexicographically or parse as floats

**Nesting depth:** Avoid beyond 2-3 levels. After `/manga/{slug}/chapters`, return URLs to sub-resources instead of deeper nesting.

### Prev/Next Chapter Navigation

**Pattern 1: Aggregate endpoint** (recommended)
- `/api/manga/{slug}/chapters/aggregate` — returns flattened array of all chapters with volume/chapter ordering
- Client finds current chapter index, increments/decrements for adjacent chapters
- Single request, efficient for navigation

**Pattern 2: Link headers** (REST standard)
- Return `Link` HTTP header with `rel="next"`, `rel="prev"`, `rel="first"`, `rel="last"`
- Example: `Link: </api/manga/x/chapters/11>; rel="next", </api/manga/x/chapters/9>; rel="prev"`

**Pattern 3: Response body links** (most explicit)
```json
{
  "chapter": {...},
  "links": {
    "prev": "/api/manga/x/chapters/9",
    "next": "/api/manga/x/chapters/11",
    "first": "/api/manga/x/chapters/1",
    "last": "/api/manga/x/chapters/1045"
  }
}
```

**Recommended for MangaFire:** Use aggregate endpoint for initial load + response body links on single chapter GET.

---

## 2. Pagination Patterns for Chapter Lists

### Cursor-Based vs Offset-Based

**For 1000+ chapters:** Use **cursor-based pagination** (consistent performance at scale).

| Aspect | Offset (`?page=5&limit=20`) | Cursor (`?after=ch_xyz&limit=20`) |
|--------|-----------------------------|------------------------------------|
| Performance | Degrades with deep pagination (OFFSET 10000 is slow) | Consistent regardless of page depth |
| Real-time data | Can skip/duplicate records if data changes | Stable — cursor points to exact row |
| Random access | Yes (jump to page 50) | No (must traverse) |
| Use case | Admin dashboards, small datasets | Infinite scroll, large/live datasets |

**Recommended for manga chapters:**
- **Cursor-based** for frontend reader (infinite scroll, 1000+ chapters)
- **Offset-based** for admin/management UI (simpler, need page numbers)

**Implementation with Drizzle:**
```typescript
// Cursor: WHERE chapter_number > cursor ORDER BY chapter_number LIMIT 20
// Offset: ORDER BY chapter_number LIMIT 20 OFFSET 100
```

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "10.5",
    "hasMore": true,
    "total": 1045
  }
}
```

---

## 3. Bulk Operations

### Creating Multiple Chapters

**Pattern 1: Dedicated bulk endpoint** (recommended)
- `POST /api/manga/{slug}/chapters/bulk`
- Body: `{ "chapters": [{ chapter: "1", pages: [...] }, {...}] }`
- Returns HTTP 207 Multi-Status with individual results
- Enforces size limits (e.g., max 100 chapters per request)

**Pattern 2: Generic batch endpoint**
- `POST /api/bulk` with sub-requests in body
- More complex, flexible for multiple resource types

**Response format (207 Multi-Status):**
```json
{
  "results": [
    { "index": 0, "status": 201, "id": "ch1", "chapter": "1" },
    { "index": 1, "status": 409, "error": "Chapter 2 already exists" },
    { "index": 2, "status": 201, "id": "ch3", "chapter": "3" }
  ],
  "summary": { "success": 2, "failed": 1 }
}
```

### Reordering Chapters

**Endpoint:** `PATCH /api/manga/{slug}/chapters/reorder`

**Body:**
```json
{
  "chapters": [
    { "id": "ch1", "order": 1 },
    { "id": "ch2", "order": 2 }
  ]
}
```

**Alternative:** `PATCH /api/chapters/bulk` with array of `{ id, chapter, volume }` updates

**Best practices:**
- Transactional: all succeed or all fail (wrap in DB transaction)
- Idempotent: same request = same result
- Long operations (>3s): return 202 Accepted with Location header to poll status

---

## 4. Read View API

### What Frontend Reader Needs

**Single chapter endpoint:** `GET /api/manga/{slug}/chapters/{number}`

**Response:**
```json
{
  "id": "ch_xyz",
  "chapter": "10.5",
  "title": "The Battle Begins",
  "volume": "2",
  "pages": [
    { "index": 0, "url": "/images/ch10.5/page-0.jpg" },
    { "index": 1, "url": "/images/ch10.5/page-1.jpg" }
  ],
  "links": {
    "prev": "/api/manga/x/chapters/10",
    "next": "/api/manga/x/chapters/11"
  },
  "metadata": {
    "pageCount": 20,
    "readingDirection": "ltr",
    "translatedBy": "Group A"
  }
}
```

### Pages Inline vs Separate Endpoint

**Inline (recommended for manga):**
- Return pages array with chapter data
- Single request for reader initialization
- Pages are essential, not optional

**Separate (if pages are large/optional):**
- `GET /api/chapters/{id}/pages` for on-demand loading
- Use when page metadata is heavy (high-res URLs, annotations)

### Preloading Adjacent Chapters

**Strategy 1: Aggregate data** (MangaDex pattern)
- Frontend fetches `/manga/{slug}/chapters/aggregate` on manga page load
- Caches full chapter list (IDs, numbers, volumes)
- Reader uses local index to determine prev/next without API calls

**Strategy 2: Prefetch hints**
- Return adjacent chapter IDs in response: `"prefetch": ["ch_prev", "ch_next"]`
- Frontend makes parallel requests: `Promise.all([fetch(prev), fetch(next)])`
- Store in memory/IndexedDB for instant navigation

**Strategy 3: Batch endpoint**
- `GET /api/chapters?ids=ch_10,ch_11,ch_12` returns multiple chapters
- Single request for current + adjacent chapters

**Recommended:** Use aggregate on initial load + prefetch hints on single chapter GET. Browser can preload images via `<link rel="prefetch">`.

---

## 5. Zod Validation Patterns

### Chapter Numbers (with Decimals)

```typescript
const chapterNumberSchema = z
  .union([z.number(), z.string()])
  .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
  .refine((val) => !isNaN(val) && val > 0, 'Invalid chapter number')
  .refine((val) => Number.isFinite(val), 'Must be finite')

// Alternative: string-only with regex
const chapterStringSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be number or decimal (e.g., 10 or 10.5)')
```

### Page Ordering

```typescript
const pageSchema = z.object({
  index: z.number().int().nonnegative(),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
})

const pagesArraySchema = z
  .array(pageSchema)
  .min(1, 'At least one page required')
  .refine(
    (pages) => {
      const indices = pages.map(p => p.index)
      return indices.every((idx, i) => idx === i)
    },
    'Page indices must be sequential starting from 0'
  )
```

### Volume Association

```typescript
const chapterCreateSchema = z.object({
  chapter: chapterNumberSchema,
  volume: z.union([z.number().int().positive(), z.null()]).optional(),
  title: z.string().max(200).optional(),
  pages: pagesArraySchema,
  language: z.enum(['en', 'jp', 'es']).default('en')
})
```

### Bulk Create Validation

```typescript
const bulkCreateSchema = z.object({
  chapters: z.array(chapterCreateSchema).max(100, 'Max 100 chapters per request')
})
```

---

## Sources

- [REST API Design: Sub and Nested Resources | Moesif](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/)
- [Designing Human-Readable Identifiers: Slugs vs IDs | Medium](https://medium.com/@dasbabai2017/designing-human-readable-identifiers-in-apis-slugs-vs-ids-6a8c919ace28)
- [API Design: Slug Fields and Identifiers | Eloquent Code](https://eloquentcode.com/api-design-slug-fields-and-identifiers)
- [API Design: Choosing between names and IDs in URLs | Google Cloud](https://cloud.google.com/blog/products/api-management/api-design-choosing-between-names-and-identifiers-in-urls)
- [Offset vs Cursor-Based Pagination | Medium](https://medium.com/@maryam-bit/offset-vs-cursor-based-pagination-choosing-the-best-approach-2e93702a118b)
- [A Developer's Guide to API Pagination | Embedded Blog](https://embedded.gusto.com/blog/api-pagination/)
- [Understanding Cursor Pagination and Why It's Fast | Milan Jovanović](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive)
- [Supporting Bulk Operations in REST APIs | Mscharhag](https://www.mscharhag.com/api-design/bulk-and-batch-operations)
- [How to Implement Bulk Operations in REST APIs | OneUptime](https://oneuptime.com/blog/post/2026-01-27-rest-api-bulk-operations/view)
- [Ideal Way to Get Adjacent Chapters | MangaDex Forums](https://forums.mangadex.org/threads/ideal-way-to-get-adjacent-chapters.2252586/)
- [MangaDex API: Find a Manga's Chapters](https://api.mangadex.org/docs/04-chapter/feed/)
- [REST Pagination with Link Headers | GitHub Docs](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api)
- [Zod Number Deep Dive | Tecktol](https://tecktol.com/zod-number/)
- [Practical Zod Guide | Akrom.dev](https://akrom.dev/blog/practical-zod-guide)

---

## Unresolved Questions

1. **Slug collision handling** — If manga title changes, should old slug redirect (301) or return 404? Need slug history table?
2. **Chapter number conflicts** — What if two scanlation groups upload chapter 10? Use `chapter + language + group_id` as composite key?
3. **Image storage** — Are page URLs CDN URLs or backend-proxied? Affects CORS, caching strategy.
4. **Aggregate endpoint caching** — For 1000+ chapters, aggregate response is large. Cache duration? Invalidate on new chapter?
5. **Bulk operation limits** — Max 100 chapters per request. Should long-running bulk ops (>3s) return 202 Accepted with job ID?
