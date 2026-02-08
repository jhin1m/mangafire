# Phase 01 - Database Schema & Indexes

## Context

- Research: [PostgreSQL FTS Report](./research/researcher-postgres-fts-report.md)
- Docs: [System Architecture](../../docs/system-architecture.md), [Codebase Summary](../../docs/codebase-summary.md)

## Parallelization

- **Runs with**: Phase 03, Phase 04 (no dependencies)
- **Blocks**: Phase 02 (search API needs schema)

## Overview

| Field | Value |
|---|---|
| Date | 2026-02-08 |
| Priority | P1 |
| Status | pending |
| Effort | 2h |
| Description | Enable pg_trgm extension, add search_vector generated column to manga table, create GIN indexes |

## Key Insights from Research

- **Generated column** (STORED) auto-computes tsvector on INSERT/UPDATE — no triggers
- **GIN index** optimal for read-heavy workloads (manga catalog is mostly reads)
- **pg_trgm** enables typo-tolerant autocomplete with similarity() scoring
- Drizzle has no native tsvector type — use `customType` or raw SQL migration

## Requirements

1. Enable `pg_trgm` PostgreSQL extension
2. Add `search_vector` generated column to `manga` table with weighted fields:
   - **Weight A**: title (highest priority)
   - **Weight B**: description
   - **Weight C**: alternativeTitles (array → string), author, artist
3. Use `'simple'` text search config (language-agnostic, better for mixed JP/KO/ZH titles)
4. Create GIN index on `search_vector` for FTS queries
5. Create GIN trigram index on `manga.title` for autocomplete
6. Migration must be idempotent (IF NOT EXISTS)
7. Existing data must be indexed on migration

## Architecture

```
manga table
├── existing columns (title, slug, description, author, artist, alternative_titles, ...)
├── search_vector tsvector GENERATED ALWAYS AS (
│     setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
│     setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
│     setweight(to_tsvector('simple', coalesce(array_to_string(alternative_titles, ' '), '')), 'C') ||
│     setweight(to_tsvector('simple', coalesce(author, '')), 'C') ||
│     setweight(to_tsvector('simple', coalesce(artist, '')), 'C')
│   ) STORED
├── idx_manga_search_vector (GIN on search_vector)
└── idx_manga_title_trgm (GIN gin_trgm_ops on title)
```

## File Ownership (Exclusive)

| File | Action |
|---|---|
| `apps/api/src/db/schema.ts` | Add search_vector column definition |
| `apps/api/src/db/migrations/add-search-fts.sql` | Raw SQL migration script |
| `apps/api/src/db/migrations/run-migration.ts` | Migration runner script |
| `apps/api/package.json` | Add `db:migrate-search` script |

No other phase touches these files.

## Implementation Steps

1. **Create migration directory** if not exists: `apps/api/src/db/migrations/`
2. **Write SQL migration** `add-search-fts.sql`:
   - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
   - `ALTER TABLE manga ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (...) STORED;`
   - `CREATE INDEX IF NOT EXISTS idx_manga_search_vector ON manga USING GIN (search_vector);`
   - `CREATE INDEX IF NOT EXISTS idx_manga_title_trgm ON manga USING GIN (title gin_trgm_ops);`
3. **Create migration runner** `apps/api/src/db/migrations/run-migration.ts` — reads SQL file and executes via postgres client
4. **Update schema.ts** — add `searchVector` column definition (type annotation only; generated column handled by SQL migration, not Drizzle push)
5. **Add npm script** to `apps/api/package.json`: `"db:migrate-search": "tsx src/db/migrations/run-migration.ts"`
6. **Test**: Run migration against local DB, verify `search_vector` is populated for existing manga rows
7. **Verify indexes**: `\di idx_manga_*` in psql confirms both GIN indexes exist

## Todo

- [ ] Create `apps/api/src/db/migrations/` directory
- [ ] Write `add-search-fts.sql` migration
- [ ] Write migration runner script
- [ ] Add searchVector column to Drizzle schema (type annotation)
- [ ] Add db:migrate-search script to package.json
- [ ] Test migration on local PostgreSQL
- [ ] Verify generated column populates for existing rows

## Success Criteria

- `pg_trgm` extension enabled
- `search_vector` column exists and auto-populates on INSERT/UPDATE
- Both GIN indexes created
- Migration is idempotent (can re-run safely)
- Existing manga rows have non-null search_vector values

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Generated column not supported (PG < 12) | Low | High | Docker compose uses PG 16 |
| Drizzle push conflicts with manual migration | Medium | Medium | Use raw SQL migration, not drizzle-kit push for FTS columns |
| pg_trgm not available in PG image | Low | Low | Default PostgreSQL 16 includes pg_trgm |

## Security Considerations

- Migration script uses parameterized connection string from env
- No user input involved in schema migration
- search_vector is read-only (GENERATED ALWAYS — cannot be directly written)

## Next Steps

Phase 02 can begin once migration is applied and search_vector is verified populated.
