# Phase 02 - Search API Endpoint

## Context

- Research: [PostgreSQL FTS Report](./research/researcher-postgres-fts-report.md)
- Docs: [System Architecture](../../docs/system-architecture.md), [Code Standards](../../docs/code-standards.md)

## Parallelization

- **Depends on**: Phase 01 (schema must exist), Phase 03 (shared validators)
- **Blocks**: Phase 05 (frontend integration needs API)

## Overview

| Field | Value |
|---|---|
| Date | 2026-02-08 |
| Priority | P1 |
| Status | pending |
| Effort | 3h |
| Description | Implement GET /api/search with full-text search, autocomplete, faceted filtering, and pagination |

## Key Insights from Research

- **Two-tier query**: ts_rank for full results, trigram similarity() for autocomplete
- **Prefix matching first**: `ILIKE query%` prioritized over fuzzy `%` operator in autocomplete
- **ts_rank normalization flag 8**: divide by 1+length prevents long descriptions dominating
- **plainto_tsquery** safer than to_tsquery (handles user input without syntax errors)

## Requirements

1. `GET /api/search` endpoint with query validation via Zod
2. **mode=autocomplete**: Fast trigram search, returns top 8 results (id, title, slug, coverImage)
3. **mode=full** (default): FTS with ts_rank, supports faceted filters (genre, status, type), paginated
4. Full results enriched with genres (reuse `enrichMangaList` from manga-helpers)
5. Input sanitization for search queries
6. AbortController support via Hono request signal

## Architecture

```
GET /api/search?q=naruto&mode=autocomplete
  → trigram similarity + ILIKE prefix
  → return [{id, title, slug, coverImage, similarity}] (max 8)

GET /api/search?q=naruto&mode=full&status=ongoing&genreId=1&page=1&limit=20
  → tsvector @@ plainto_tsquery with ts_rank
  → apply status/type/genre facet filters
  → return paginated results with genres + latestChapters
```

### Query Processing Pipeline

```
Raw query string
  → Zod validation (min 1 char, max 200, trim)
  → Sanitize (escape SQL wildcards for ILIKE)
  → Branch by mode:
    autocomplete → trigram query
    full → plainto_tsquery + facet conditions
```

## File Ownership (Exclusive)

| File | Action |
|---|---|
| `apps/api/src/routes/search.ts` | New file — search route handler |
| `apps/api/src/routes/search-helpers.ts` | New file — query builders, sanitization |
| `apps/api/src/index.ts` | Add route mount: `app.route('/api/search', searchRoutes)` |

No other phase touches these files. Phase 02 is the ONLY phase that edits `index.ts`.

## Implementation Steps

1. **Create `search-helpers.ts`**:
   - `sanitizeSearchQuery(q: string): string` — trim, escape ILIKE wildcards (reuse pattern from `manga-helpers.ts:escapeIlike`)
   - `buildAutocompleteQuery(q: string)` — returns Drizzle SQL selecting id, title, slug, coverImage, similarity score; uses `ILIKE prefix% THEN 1 ELSE 2` ordering + `similarity(title, q) DESC` WHERE `similarity(title, q) > 0.3`; limit 8
   - `buildFullTextQuery(q: string)` — returns WHERE condition: `search_vector @@ plainto_tsquery('simple', q)`
   - `buildFacetConditions(params)` — reuse pattern from `buildMangaConditions` in `manga-helpers.ts` for status, type, genreId filters
   - `getRankOrder(q: string)` — returns `ts_rank(search_vector, plainto_tsquery('simple', q), 8) DESC`
   - **Note**: Reuse `enrichMangaList()` from `manga-helpers.ts` for genre/chapter enrichment — do NOT duplicate

2. **Create `search.ts`**:
   - Import `searchQueryParamsSchema` from `@mangafire/shared`
   - `GET /` handler:
     - Validate query params with Zod
     - If `mode === 'autocomplete'`: call autocomplete query, return slim results
     - If `mode === 'full'`: build conditions array (FTS + facets), fetch with rank ordering + pagination, enrich results
   - Use `successResponse` from `api-response.ts`

3. **Mount in `index.ts`**:
   - Add `import { searchRoutes } from './routes/search'`
   - Add `app.route('/api/search', searchRoutes)` in public routes section

4. **Handle edge cases**:
   - Empty query (q=""): return empty results, not 400
   - No FTS match but trigram match: autocomplete still returns results
   - Special characters in query: sanitized before SQL

5. **Test endpoints**:
   - `GET /api/search?q=nar&mode=autocomplete` → returns matching titles
   - `GET /api/search?q=naruto&status=ongoing&page=1` → full results with facets
   - `GET /api/search?q=` → empty results array

## Todo

- [ ] Create `search-helpers.ts` with query builders
- [ ] Create `search.ts` route handler
- [ ] Mount route in `index.ts`
- [ ] Test autocomplete mode
- [ ] Test full search mode with facets
- [ ] Test edge cases (empty query, special chars, no results)
- [ ] Verify ts_rank ordering matches expected relevance

## Success Criteria

- Autocomplete returns results in <100ms for local DB
- Full search returns ranked results with correct facet filtering
- Pagination meta matches existing API response format
- No SQL injection via search query input
- Empty/invalid queries handled gracefully (no 500 errors)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| plainto_tsquery fails on empty string | Medium | Low | Guard with `q.length > 0` check |
| Trigram similarity too permissive (low threshold) | Medium | Low | Set threshold to 0.3, can tune later |
| ts_rank slow on large datasets | Low | Medium | GIN index + normalization flag 8; cache layer deferred |
| Import from shared package fails | Low | Medium | Verify `@mangafire/shared` exports after Phase 03 |

## Security Considerations

- **Input sanitization**: Escape `%`, `_` in ILIKE patterns; use parameterized queries via Drizzle sql`` template
- **Query length limit**: Max 200 chars via Zod validation
- **No raw SQL concatenation**: All queries use Drizzle's sql tagged template (parameterized)
- **Rate limiting**: Not in scope (Phase 7), but search endpoint is a candidate for future rate limiting

## Next Steps

After Phase 02, frontend (Phase 05) can integrate with search API using TanStack Query hooks.
