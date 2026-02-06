# Phase 02: Database Schema & Migration

## Context

- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: None (independent)
- **Docs**: [system-architecture.md](../../docs/system-architecture.md)

## Parallelization

- **Runs parallel with**: Phase 01 (Shared Types)
- **Blocks**: Phase 03 (Chapter API), Phase 04 (Volume API)
- **Shared file risk**: None — only this phase touches `schema.ts`

## Overview

- **Date**: 2026-02-06
- **Description**: Add volumes, chapters, and chapter_pages tables to Drizzle schema with relations, indexes, and constraints
- **Priority**: P1
- **Status**: done (2026-02-06)
- **Effort**: 1.5h

## Key Insights

- Append to existing `schema.ts` — do NOT reorganize existing tables
- Follow existing patterns: `serial` PK, `timestamp` with `defaultNow()`, `index()` in table config callback
- Reuse existing `languageEnum` for chapters
- Chapter `number` stored as `text` (supports "10.5") — unique composite with (mangaId, number, language)
- `pageCount` denormalized on chapters for efficient list queries (avoid COUNT subquery)
- Must update existing `mangaRelations` to add `volumes` and `chapters` relations

## Requirements

1. `volumes` table with FK to manga
2. `chapters` table with FK to manga + optional FK to volume
3. `chapter_pages` table with FK to chapter
4. All relations defined for Drizzle query API
5. Update existing `mangaRelations`
6. Proper indexes for query performance

## Architecture

```sql
manga (existing)
  |-- 1:N --> volumes
  |-- 1:N --> chapters
                |-- 1:N --> chapter_pages
volumes
  |-- 1:N --> chapters (optional association)
```

## Related Code Files

Modified by this phase:
- `apps/api/src/db/schema.ts` — append new tables, update `mangaRelations`

Reference (read-only):
- `apps/api/src/db/client.ts` — db connection (unchanged)
- `apps/api/src/db/seed.ts` — pattern for seed script

## File Ownership

| File | Action |
|------|--------|
| `apps/api/src/db/schema.ts` | MODIFY (append tables + update mangaRelations) |

## Implementation Steps

### Step 1: Add volumes table (append after mangaGenres)

```typescript
// ─── Volumes & Chapters ─────────────────────────────────────────────

// Volumes table
export const volumes = pgTable(
  'volumes',
  {
    id: serial('id').primaryKey(),
    mangaId: integer('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title'),
    coverImage: text('cover_image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    mangaIdIdx: index('volumes_manga_id_idx').on(table.mangaId),
    uniqueMangaVolume: unique('volumes_manga_number_unique').on(
      table.mangaId,
      table.number
    ),
  })
)
```

### Step 2: Add chapters table

```typescript
// Chapters table
export const chapters = pgTable(
  'chapters',
  {
    id: serial('id').primaryKey(),
    mangaId: integer('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    volumeId: integer('volume_id').references(() => volumes.id, {
      onDelete: 'set null',
    }),
    number: text('number').notNull(), // "10.5" — text for decimal support
    title: text('title'),
    slug: text('slug').notNull(),
    language: languageEnum('language').notNull().default('en'),
    pageCount: integer('page_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    mangaIdIdx: index('chapters_manga_id_idx').on(table.mangaId),
    slugIdx: index('chapters_slug_idx').on(table.slug),
    uniqueChapter: unique('chapters_manga_number_lang_unique').on(
      table.mangaId,
      table.number,
      table.language
    ),
  })
)
```

### Step 3: Add chapter_pages table

```typescript
// Chapter pages table
export const chapterPages = pgTable(
  'chapter_pages',
  {
    id: serial('id').primaryKey(),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    imageUrl: text('image_url').notNull(),
    width: integer('width'),
    height: integer('height'),
  },
  (table) => ({
    chapterIdIdx: index('chapter_pages_chapter_id_idx').on(table.chapterId),
    uniquePage: unique('chapter_pages_chapter_page_unique').on(
      table.chapterId,
      table.pageNumber
    ),
  })
)
```

### Step 4: Update existing mangaRelations

Replace the current `mangaRelations` definition:

```typescript
// BEFORE:
export const mangaRelations = relations(manga, ({ many }) => ({
  mangaGenres: many(mangaGenres),
}))

// AFTER:
export const mangaRelations = relations(manga, ({ many }) => ({
  mangaGenres: many(mangaGenres),
  volumes: many(volumes),
  chapters: many(chapters),
}))
```

### Step 5: Add new relations

```typescript
// Volume relations
export const volumeRelations = relations(volumes, ({ one, many }) => ({
  manga: one(manga, {
    fields: [volumes.mangaId],
    references: [manga.id],
  }),
  chapters: many(chapters),
}))

// Chapter relations
export const chapterRelations = relations(chapters, ({ one, many }) => ({
  manga: one(manga, {
    fields: [chapters.mangaId],
    references: [manga.id],
  }),
  volume: one(volumes, {
    fields: [chapters.volumeId],
    references: [volumes.id],
  }),
  pages: many(chapterPages),
}))

// Chapter page relations
export const chapterPageRelations = relations(chapterPages, ({ one }) => ({
  chapter: one(chapters, {
    fields: [chapterPages.chapterId],
    references: [chapters.id],
  }),
}))
```

### Step 6: Push schema

```bash
cd apps/api && pnpm db:push
```

## Todo

- [x] Append `volumes` table to `schema.ts`
- [x] Append `chapters` table to `schema.ts`
- [x] Append `chapterPages` table to `schema.ts`
- [x] Update `mangaRelations` to include `volumes` and `chapters`
- [x] Add `volumeRelations`, `chapterRelations`, `chapterPageRelations`
- [x] Run `pnpm type-check` in api package
- [x] Run `pnpm db:push` to apply schema

## Success Criteria

- `pnpm db:push` completes without errors
- All 3 new tables visible in Drizzle Studio (`pnpm db:studio`)
- Existing manga/genres queries still work (no regression)
- FK constraints enforce referential integrity (cascade deletes work)

## Conflict Prevention

- **Only this phase modifies `schema.ts`**
- Existing table definitions are NOT moved/reformatted — only appended to
- The one in-place edit is `mangaRelations` (adding 2 new relation fields)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing mangaRelations | High | Only add new fields to the object, don't remove existing |
| `db:push` fails on constraint | Medium | Test with empty DB first; check column types match |
| Schema drift if someone pushes manually | Low | Use `db:generate` for migration file tracking |

## Security Considerations

- Cascade deletes ensure no orphaned pages when chapter/manga deleted
- `set null` on volumeId so chapter survives volume deletion
- Unique constraints prevent duplicate chapters per manga+number+language

## Next Steps

After `db:push` succeeds, Phase 03 (Chapter API) and Phase 04 (Volume API) can begin.
