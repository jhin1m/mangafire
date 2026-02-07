# API Capabilities Research: MangaFire Manga Endpoints

**Date**: 2026-02-07
**Researcher**: Claude
**Focus**: GET /api/manga filtering, sorting, pagination capabilities

---

## Executive Summary

Backend supports robust filtering/sorting via single unified endpoint `GET /api/manga` with query parameters. Frontend pages (/newest, /updated, /added) currently **DO NOT HAVE DEDICATED API ENDPOINTS** — they must be implemented by mapping frontend "page types" to backend query parameters.

---

## Current API Capabilities

### GET /api/manga Query Parameters

All validated by `mangaQueryParamsSchema` (packages/shared/src/validators/manga.ts:67-76):

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int | 1 | Positive integer, coerced from string |
| `limit` | int | 20 | Max 100 |
| `status` | enum | optional | `ONGOING`, `COMPLETED`, `HIATUS`, `CANCELLED` |
| `type` | enum | optional | `MANGA`, `MANHUA`, `MANHWA`, `LIGHT_NOVEL` |
| `genreId` | int | optional | Positive integer, filters manga with matching genre |
| `search` | string | optional | Full-text search (max 200 chars, case-insensitive via ILIKE) |
| `sortBy` | enum | `createdAt` | Values: `rating`, `views`, `createdAt`, `title` |
| `sortOrder` | enum | `desc` | Values: `asc`, `desc` |

### Response Format

```json
{
  "success": true,
  "data": [/* enriched manga objects with genres */],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Data enrichment** (line 47, 60): Manga list automatically enriched with genre associations via `enrichMangaList()`.

---

## Frontend "Specialty Pages" Gap

Frontend defines three route-based "specialty pages" (apps/web/src/configs/routes.config/appsRoute.tsx):
- `/newest` — expected: newest manga by creation date
- `/updated` — expected: recently updated manga
- `/added` — expected: recently added manga

**PROBLEM**: No dedicated API endpoints exist. Frontend expects sort options like `recently_added`, `recently_updated` but backend only supports:
- `sortBy: ['rating', 'views', 'createdAt', 'title']` (none match "updated" concept)
- Database schema likely missing `updatedAt` column or sorting support

---

## Implementation Requirements

### 1. Backend Schema & Sorting
- Verify `manga` table has `updatedAt` column for "recently updated" filtering
- Map frontend sort labels to backend `sortBy` values:
  - `recently_added` → `sortBy=createdAt&sortOrder=desc`
  - `recently_updated` → `sortBy=updatedAt&sortOrder=desc` (if supported)
  - `newest` → `sortBy=createdAt&sortOrder=desc`

### 2. Frontend API Integration
- Convert page-based routes to parameterized `GET /api/manga` calls
- Example for `/newest`:
  ```
  GET /api/manga?sortBy=createdAt&sortOrder=desc&limit=20&page=1
  ```

### 3. Missing Backend Features (If Required)
- No dedicated "trending" or "popular" endpoint (would need `views` or `rating` column support)
- No "random" endpoint (backend may need `ORDER BY RANDOM()` support)
- Genre-based trending already supported (genreId + sortBy combinations work)

---

## API Route Implementation Details

**Endpoint**: `GET /api/manga` (apps/api/src/routes/manga.ts:31-63)

**Flow**:
1. Validate query params via `mangaQueryParamsSchema`
2. Build WHERE conditions from status, type, search filters
3. Execute conditional query:
   - If `genreId` present: join with `mangaGenres` table
   - Else: direct manga table query
4. Apply `sortBy` + `sortOrder` (via `getSortConfig()`)
5. Apply pagination (offset/limit)
6. Enrich results with genres
7. Return paginated response

**Genre filtering logic** (manga-helpers.ts:81, 95):
- `mangaGenres` join on `manga.id = mangaGenres.mangaId`
- Filter by `mangaGenres.genreId = :genreId`
- Deduplication handled by query result set

---

## Unresolved Questions

1. **Does `manga` table have `updatedAt` column?** (Needed for "recently updated" sorting)
2. **Are `views` and `rating` columns populated** in manga table? (Required for rating/views sort)
3. **Should `/newest`, `/updated`, `/added` be served from same GET /api/manga** or need dedicated endpoints?
4. **What is frontend's "Recently added" vs "Newly added" distinction?**
5. **Does frontend expect sorting UI on specialty pages**, or fixed sort order?

---

## Recommendations

- **Immediate**: Map frontend `/newest`, `/updated`, `/added` routes to `GET /api/manga` with appropriate `sortBy`/`sortOrder` params
- **Verify**: Check database schema for `updatedAt`, `views`, `rating` columns
- **Consider**: Add dedicated endpoint (e.g., `GET /api/manga/trending`) if trending logic becomes complex
- **Document**: Update API spec with example sort/filter combinations
