# Report: Phase 4 — Chapters & Volumes Plan

**Agent**: planner | **Date**: 2026-02-06 | **Duration**: ~10min

## Summary

Created comprehensive 4-phase parallel implementation plan for chapters and volumes backend. All files located at `plans/260206-1825-phase4-chapters-volumes/`.

## Deliverables

| File | Description |
|------|-------------|
| `plan.md` | Master plan with dependency graph, file ownership matrix, success criteria |
| `phase-01-shared-types.md` | Types + Zod validators in `@mangafire/shared` |
| `phase-02-database-schema.md` | volumes, chapters, chapter_pages tables + relations |
| `phase-03-chapter-api.md` | Full CRUD for `/api/manga/:slug/chapters` with pages + navigation |
| `phase-04-volume-api.md` | CRUD for `/api/manga/:slug/volumes` |

## Key Design Decisions

- **Chapter number as text** ("10.5") — supports decimal chapters, stored as `text` in DB
- **Pages inline** with chapter response — single request for reader
- **Prev/next navigation** computed from adjacent chapters by number
- **Unique constraint**: (mangaId, number, language) on chapters
- **Cascade deletes**: manga -> chapters -> pages; volume delete sets chapter.volumeId null
- **No separate pages endpoint** — YAGNI; pages always fetched with their chapter

## Parallelization Strategy

```
Wave 1 (parallel):  Phase 01 + Phase 02  (~1.5h)
Wave 2 (parallel):  Phase 03 + Phase 04  (~2h)
Total effort:       ~6h (3.5h wall-clock with parallelism)
```

## File Ownership (No Conflicts)

- Phase 01: `packages/shared/src/{types,validators}/chapter.ts` + barrel export updates
- Phase 02: `apps/api/src/db/schema.ts` (append-only)
- Phase 03: `apps/api/src/routes/chapters.ts`, `chapter-helpers.ts`, `index.ts` (chapter mount)
- Phase 04: `apps/api/src/routes/volumes.ts`, `index.ts` (volume mount, after chapter block)

## Known Risks

1. **Text ordering of chapter numbers** — "10" < "2" lexicographically. MVP-acceptable; fix with `::numeric` cast in Phase 5 if needed
2. **Slug extraction from URL** — chapter routes use URL path parsing to get manga slug. May need refinement if Hono provides cleaner parent param access.

## Unresolved Questions

1. Should chapter number ordering use `::numeric` cast now or defer to Phase 5?
2. Should `findMangaBySlug` be extracted to a shared helper used by both chapter and volume routes (DRY)?
3. Image storage strategy for chapter pages — CDN URLs or backend-proxied? Affects `imageUrl` validation.
