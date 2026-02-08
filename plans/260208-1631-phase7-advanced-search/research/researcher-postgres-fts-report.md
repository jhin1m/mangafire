# PostgreSQL Full-Text Search Research Report
**MangaFire Advanced Search - Phase 7**
**Date**: 2026-02-08

---

## Executive Summary

PostgreSQL provides robust native full-text search (FTS) capabilities without external dependencies. For MangaFire, a two-tiered approach is optimal:
1. **tsvector + ts_rank** for title/description semantic search (high precision)
2. **pg_trgm** for autocomplete & fuzzy matching (typo tolerance)

Both integrate with Drizzle ORM via raw SQL. GIN indexes provide fast lookups; trigram searches scale well for autocomplete.

---

## 1. Full-Text Search (tsvector)

### How tsvector Works
`tsvector` tokenizes text into lexemes, enabling phrase queries and relevance ranking. PostgreSQL provides:
- `to_tsvector()` — converts text to searchable tokens
- `to_tsquery()` — parses search queries
- `ts_rank()` / `ts_rank_cd()` — relevance scoring
- `setweight()` — assign weight (A/B/C/D) to document parts

### Index Strategy: GIN vs GiST

| Index Type | Use Case | Lookups | Updates | Size | Phrase Queries |
|-----------|----------|---------|---------|------|---|
| **GIN** | Read-heavy, large vocabularies | Fast ✓ | Slower | Smaller | No |
| **GiST** | Frequent updates, phrase matching | Slower | Faster | Larger | Yes ✓ |

**Recommendation**: Use **GIN** for MangaFire (read-heavy, static manga data).

### Weighting Strategy
For manga titles vs descriptions:
```sql
setweight(to_tsvector('english', title), 'A') ||
setweight(to_tsvector('english', description), 'B')
```

Title matches (weight A) rank higher than descriptions (weight B).

### ts_rank Normalization
Longer documents inflate scores. Use normalization flags:
- `0` — no normalization
- `2` — divide by document length
- `8` — divide by 1 + document length (recommended)
- Combine with `|` (e.g., `2|8`)

---

## 2. Fuzzy Matching & Autocomplete (pg_trgm)

### What is pg_trgm?
**Trigram similarity** breaks text into 3-character chunks. Example: "manga" → `" m", "ma", "an", "ng", "ga", "a "`.

- Measures similarity between strings (0.0–1.0)
- Default threshold: 0.3
- Powers typo-tolerant autocomplete

### Operators
- `%` — fuzzy match (similarity > threshold)
- `<% ` / `%>` — strict left/right prefix matching
- `similarity(text1, text2)` — get score

### Performance
- **GIN index** → fast lookups, slower updates
- **GiST index** → slower lookups, faster updates
- For autocomplete: **GIN** recommended (read-heavy)

### Use Cases
- "manag" matches "manga" (similarity 0.5)
- "blede" matches "blade" (typo tolerance)
- Prefix autocomplete with ILIKE

---

## 3. Drizzle ORM Integration

### Issue: No Native tsvector Support
Drizzle doesn't expose `tsvector` type. Workarounds:

#### Option A: Generated Column (Recommended)
```sql
-- Migration: Create precomputed tsvector column
ALTER TABLE manga ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', description), 'B')
) STORED;

CREATE INDEX idx_manga_search_vector ON manga
USING GIN (search_vector);
```

Drizzle schema:
```typescript
export const manga = pgTable('manga', {
  id: serial('id').primaryKey(),
  title: varchar('title'),
  description: text('description'),
  searchVector: unknown('search_vector'), // or use sql<tsvector>`...`
});
```

Query with Drizzle + SQL:
```typescript
import { sql } from 'drizzle-orm';

db.select().from(manga)
  .where(
    sql`${manga.searchVector} @@ to_tsquery('english', ${query})`
  )
  .orderBy(
    sql`ts_rank(${manga.searchVector}, to_tsquery('english', ${query})) DESC`
  );
```

#### Option B: On-the-Fly Computation (Lower Performance)
```typescript
db.select().from(manga)
  .where(
    sql`to_tsvector('english', ${manga.title}) @@
        to_tsquery('english', ${query})`
  );
```

No precomputation; slower but simpler schema.

### Trigram Index + Drizzle
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for autocomplete
CREATE INDEX idx_manga_title_trgm ON manga USING GIN (title gin_trgm_ops);
```

Query:
```typescript
db.select().from(manga)
  .where(sql`${manga.title} % ${searchTerm}`)
  .orderBy(sql`similarity(${manga.title}, ${searchTerm}) DESC`)
  .limit(10);
```

---

## 4. Recommended Architecture for MangaFire

### Schema (Drizzle Migration)
```typescript
export const manga = pgTable('manga', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  // ... other fields

  // Generated tsvector for full-text search
  searchVector: unknown('search_vector'),
});

// Indexes
export const searchVectorIdx = index('idx_manga_search_vector')
  .on(sql`search_vector`)
  .using(sql`GIN`);

export const titleTrigamIdx = index('idx_manga_title_trgm')
  .on(sql`title`)
  .using(sql`GIN (title gin_trgm_ops)`);
```

### API Endpoints

**Semantic Search** (titles, descriptions, chapters):
```typescript
// POST /api/search/semantic
const results = await db.select()
  .from(manga)
  .where(
    sql`${manga.searchVector} @@
        to_tsquery('english', ${query})`
  )
  .orderBy(
    sql`ts_rank(${manga.searchVector},
        to_tsquery('english', ${query})) DESC`
  )
  .limit(20);
```

**Autocomplete** (fast prefix + fuzzy):
```typescript
// GET /api/search/autocomplete?q=manga
const autocomplete = await db.select()
  .from(manga)
  .where(
    sql`(${manga.title} ILIKE ${query + '%'}) OR
        (${manga.title} % ${query})`
  )
  .orderBy(
    sql`CASE WHEN ${manga.title} ILIKE ${query + '%'} THEN 1 ELSE 2 END,
        similarity(${manga.title}, ${query}) DESC`
  )
  .limit(10);
```

---

## 5. Performance Comparison

| Approach | Latency | Typo Tolerance | Phrase Queries | Index Size | Update Cost |
|----------|---------|---|---|---|---|
| **tsvector (GIN)** | <100ms | No | Yes | Small | Low |
| **pg_trgm (GIN)** | <50ms | Yes | No | Medium | Low |
| **LIKE %term%** | ~1s (800K rows) | No | No | None | —  |
| **Full-text (ts_rank)** | 25-30s (800K rows) | No | Yes | Small | Medium |

Caveat: ts_rank degrades 25-30s at 800K rows; consider materialized views or caching at scale.

---

## 6. Implementation Roadmap

1. **Phase 1**: Enable pg_trgm; add trigram index on titles
2. **Phase 2**: Create generated `search_vector` column with GIN index
3. **Phase 3**: Implement `/api/search/autocomplete` endpoint
4. **Phase 4**: Implement `/api/search/semantic` endpoint with ts_rank
5. **Phase 5**: Optional — caching layer (Redis) for top queries if perf needed

---

## Pros & Cons Summary

### tsvector + ts_rank
✓ Semantic ranking, phrase detection
✓ Multi-field weighting
✗ Slower at scale (800K+ rows degrade to 25-30s)
✗ No typo tolerance

### pg_trgm
✓ Fast autocomplete (<50ms)
✓ Typo-tolerant
✗ No relevance ranking
✗ Larger indexes (trigram storage)

### Combined Approach
✓ Semantic search + typo-tolerant autocomplete
✓ Precomputed tsvector avoids recomputation
✓ Minimal schema changes (generated column)
✗ Two index types to maintain

---

## Sources

- [PostgreSQL Full-Text Search Documentation](https://www.postgresql.org/docs/current/textsearch-indexes.html)
- [PostgreSQL GIN Index Guide - pganalyze](https://pganalyze.com/blog/gin-index)
- [ParadeDB Full-Text Search](https://www.paradedb.com/learn/search-in-postgresql/full-text-search)
- [pg_trgm Trigram Matching Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Fuzzy Matching Tutorial - DEV Community](https://dev.to/talemul/fuzzy-string-matching-in-postgresql-with-pgtrgm-trigram-search-tutorial-2hc6)
- [Fast Autocomplete with pg_trgm](https://benwilber.github.io/programming/2024/08/21/pg-trgm-autocomplete.html)
- [Drizzle ORM Full-Text Search Guide](https://orm.drizzle.team/docs/guides/postgresql-full-text-search)
- [Full-Text Search with Generated Columns](https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns)
- [BetterStack FTS Guide with TypeScript](https://betterstack.com/community/guides/scaling-nodejs/full-text-search-in-postgres-with-typescript/)
- [PostgreSQL ts_rank Relevance Ranking](https://www.postgresql.org/docs/current/textsearch-controls.html)
- [ts_rank Best Practices - Sling Academy](https://www.slingacademy.com/article/postgresql-full-text-search-a-guide-to-ts-rank-for-relevance-ranking/)

---

## Unresolved Questions

1. **Manga count at launch**: Scale estimates needed for ts_rank performance tuning
2. **Search term analytics**: High-value queries for caching/materialization?
3. **Language support**: English stemming sufficient, or multilingual support needed?
4. **Real-time indexing**: Can tolerate eventual consistency (batch updates), or need immediate index?
