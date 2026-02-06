# Research Report: Manga CRUD API Design

**Date**: 2026-02-06
**Researcher**: researcher (a91fe67)
**Scope**: Data model, REST endpoints, PostgreSQL + Drizzle schema, filtering, image handling

---

## 1. Database Schema Design

### Core Tables

**manga**
- `id` (identity primary key, preferred over serial in modern PostgreSQL)
- `slug` (unique index for SEO-friendly URLs)
- `title` (indexed for search)
- `description` (text)
- `cover_url` (CDN URL)
- `status` (enum: ongoing, completed, hiatus, cancelled)
- `type` (enum: manga, manhwa, manhua, novel)
- `release_year` (integer, indexed for filtering)
- `created_at`, `updated_at` (timestamps)

**chapters**
- `id` (identity)
- `manga_id` (FK, indexed)
- `number` (numeric for decimals like 5.5)
- `title` (nullable)
- `release_date` (date, indexed)
- `language` (varchar)
- Composite unique index on `(manga_id, number, language)`

**genres** (lookup table)
- `id`, `slug`, `name`, `image_url`

**manga_genres** (junction table)
- `manga_id` (FK, indexed)
- `genre_id` (FK, indexed)
- Composite primary key `(manga_id, genre_id)`

**volumes** (optional for read-by-volume support)
- `id`, `manga_id`, `number`, `cover_url`

**chapter_pages**
- `id`, `chapter_id`, `page_number`, `image_url`
- Composite unique index on `(chapter_id, page_number)`

### Drizzle ORM Best Practices
- Use identity columns: `id: integer().primaryKey().generatedByDefaultAsIdentity()`
- Always index foreign keys
- Unique index on slugs: `slugIdx: uniqueIndex("slug_idx").on(table.slug)`
- Use `relations()` for type-safe joins
- One schema file per resource for organization

---

## 2. RESTful API Endpoints

### Manga Resources

**GET** `/api/manga`
Query params: `?genre=action,romance&status=ongoing&type=manga&year=2024&sort=popularity&page=1&limit=20`
Response: `{ data: Manga[], meta: { total, page, limit, pages } }`
Status: 200

**GET** `/api/manga/:slug`
Response: `{ data: MangaDetail }` (includes genres, chapter count, volumes)
Status: 200 | 404

**POST** `/api/manga`
Body: `{ title, description, status, type, release_year, genre_ids[], cover_url }`
Response: `{ data: Manga }`
Status: 201 Created

**PUT** `/api/manga/:id`
Body: Full manga object (replace)
Status: 200

**PATCH** `/api/manga/:id`
Body: Partial updates
Status: 200

**DELETE** `/api/manga/:id`
Status: 204 No Content

### Nested Resources

**GET** `/api/manga/:slug/chapters`
Query: `?page=1&limit=50&lang=en`
Response: Paginated chapters

**POST** `/api/manga/:id/chapters`
Body: `{ number, title, release_date, language }`
Status: 201

**GET** `/api/manga/:slug/chapters/:number`
Response: Chapter with pages array

**PUT/PATCH/DELETE** `/api/chapters/:id`
Direct chapter manipulation (avoid nesting beyond 2 levels)

### Filtering Endpoints

**GET** `/api/genres`
Response: All genres (for filter UI)

**GET** `/api/manga/search`
Query: `?q=one+piece&fields=title,description`
Response: Text search results

---

## 3. Filtering & Search Patterns

### Multi-Criteria Filtering
Align with existing `FilterDropdown` type:
- `genre`: array of genre IDs (`includedTags[]` pattern from MangaDex)
- `status[]`: ongoing, completed, hiatus, cancelled
- `type[]`: manga, manhwa, manhua, novel
- `year`: range (`year_gte=2020&year_lte=2024`)
- `language`: ISO codes
- `sort`: popularity, updated_at, release_year, title (asc/desc)

### Pagination
- Use offset-based: `?page=1&limit=20`
- Response meta: `{ total, page, limit, pages }`
- Default limit: 20, max: 100

### URL State Preservation
- All filters as GET params for shareable/SEO-friendly URLs
- Example: `/manga?genre=action,fantasy&status=ongoing&year=2024`

### Full-Text Search
- Drizzle supports PostgreSQL full-text search via `tsvector`
- Index on `title` and `description` columns
- Use `?q=` for text search, combine with filters

---

## 4. Image/Cover URL Handling

### Storage Strategy
- **Store CDN URLs only** (not local paths)
- Don't expose public URLs directly — use CDN as reverse proxy
- Recommended services: Cloudinary, ImageKit, Uploadcare

### URL Format
Image CDN URLs encode params: size, format, quality
Example: `https://cdn.example.com/covers/{manga_id}/cover.jpg?w=300&q=80&f=webp`

### Database Schema
- `cover_url` (varchar) stores full CDN URL
- `chapter_pages.image_url` stores CDN URL per page
- No local file paths in DB

### Image Formats
- Serve WebP/AVIF for modern browsers (40-80% size reduction)
- CDNs auto-convert based on `Accept` header
- Fallback to JPEG/PNG

### Security
- Use signed URLs for protected content (chapters)
- Public covers can be unsigned
- CDN handles caching, geo-distribution

---

## 5. Data Model Decisions

### Align with Existing Types

**Genre type** (current):
```ts
type Genre = { image: string; type: string; title: string; chapters: {...}[] }
```
**Issue**: Conflates genre with manga. Recommend split:
```ts
type Genre = { id: string; slug: string; name: string; image_url: string }
type MangaListItem = { id, slug, title, cover_url, status, genres: Genre[] }
```

**GenreTrending** → rename to `MangaCardDetail` (more accurate)

**Poster** → keep for homepage carousels

**ENUM_READ_BY** → align with DB `type` enum or reading mode (chapter vs volume navigation)

### Enums to Define
```ts
enum MangaStatus { ongoing, completed, hiatus, cancelled }
enum MangaType { manga, manhwa, manhua, novel }
enum Language { en, ja, ko, zh, es, fr }
enum SortOrder { asc, desc }
```

### Response Format
```ts
type ApiResponse<T> = {
  data: T;
  meta?: { total: number; page: number; limit: number; pages: number };
  error?: { code: string; message: string };
}
```

---

## 6. Design Rationale

### Why Slugs?
- SEO-friendly: `/manga/one-piece` vs `/manga/123`
- User-readable
- Unique constraint prevents duplicates
- Indexed for fast lookups

### Why Junction Table for Genres?
- Many-to-many: one manga has many genres, one genre has many manga
- Normalized (3NF)
- Efficient filtering: `JOIN manga_genres WHERE genre_id IN (1,2,3)`

### Why Identity over Serial?
- Modern PostgreSQL recommendation (v10+)
- More control: `startWith`, `increment`, `minValue`, `maxValue`
- Drizzle fully supports identity columns

### Why Nested Routes Limited to 2 Levels?
- `/manga/:slug/chapters` is clear
- `/manga/:slug/chapters/:num/pages/:page` becomes unwieldy
- Use direct `/chapters/:id` and `/pages/:id` for deep operations

### Why Offset Pagination?
- Simpler implementation than cursor-based
- Sufficient for manga listings (not real-time feeds)
- Matches existing `TableQueries.pageIndex` type

---

## Unresolved Questions

1. **Author/Artist tables?** Not in existing types — include or defer?
2. **Bookmarks/Reading progress?** User-specific data — separate service or include?
3. **Image upload flow?** API accepts URLs only, or support multipart upload + CDN integration?
4. **Chapter versioning?** Multiple scanlation groups upload same chapter — handle duplicates?
5. **Soft delete?** Add `deleted_at` timestamp or hard delete manga/chapters?
6. **Rate limiting?** Public API needs throttling — specify in spec?

---

## Sources

- [Best Practices for REST API Design - Stack Overflow](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [REST API Standards & Best Practices 2026](https://www.boltic.io/blog/rest-api-standards)
- [REST API URI Naming Conventions](https://restfulapi.net/resource-naming/)
- [Drizzle ORM PostgreSQL Best Practices (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [Drizzle ORM - Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [MangaDex API - Searching for a manga](https://api.mangadex.org/docs/03-manga/search/)
- [Image CDNs Guide](https://imagekit.io/blog/what-is-image-cdn-guide/)
- [Cloudinary Image Upload Complete Guide 2026](https://dev.to/marufrahmanlive/cloudinary-image-upload-in-nodejs-complete-guide-for-2026-2gd6)
