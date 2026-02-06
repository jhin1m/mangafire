---
title: "Chapter Reader API Integration"
description: "Replace all hardcoded mock data in the manga reader with real API calls using existing hooks/services"
status: completed
priority: P1
effort: 4h
branch: main
tags: [frontend, reader, api-integration, chapters]
created: 2026-02-06
---

# Chapter Reader API Integration

## Goal
Replace 100% of hardcoded mock data (56 images from `/temp/`, hardcoded chapter lists, hardcoded page counts) in the reader with real API data using existing `useChapterDetail` and `useChapterList` hooks.

## Current State
- **Services**: `chapter-service.ts`, `manga-service.ts` - DONE
- **Hooks**: `use-chapters.ts` (useChapterDetail, useChapterList) - DONE
- **API**: `GET /api/manga/:slug/chapters/:number` returns `ChapterWithPages` with pages[] + navigation - DONE
- **Reader**: All components use hardcoded `new Array(56)` and `imagePath()` function

## Hardcoded Mock Data Inventory

| File | Mock Data | Line(s) |
|------|-----------|---------|
| `views/read/Read.tsx` | `new Array(56)`, `imagePath()`, `pageIndex < 56` | 22-24, 45-53, 70-83 |
| `views/read/components/PageType/Single.tsx` | `new Array(56)`, `imagePath()` | 15-16, 52, 68 |
| `views/read/components/PageType/LongStripImage.tsx` | receives hardcoded `src` | props |
| `views/read/components/PageType/DoubleImage.tsx` | receives hardcoded `src` | props |
| `components/layouts/ReadLayout.tsx` | `pageIndex < 56`, `pageIndex === 56` | 80, 125 |
| `components/layouts/components/ProgressBar/ProgressBar.tsx` | `new Array(56)`, text "56" | 26, 40 |
| `components/layouts/components/SubPanel/SubPanelChapter.tsx` | 242 hardcoded chapters array | 14-1256 |
| `components/layouts/components/SubPanel/SubPanelPage.tsx` | `new Array(56)` | 49 |
| `components/template/Read/Header.tsx` | "241/241", "56" total pages | 222-237 |

## Dependency Graph

```
Phase 01 (Reader Context) ──> Phase 02 (Reader Components) ──> Phase 03 (Layout Components)
```

All phases sequential — Phase 02 needs context from Phase 01, Phase 03 needs same context.

## File Ownership Matrix

| Phase | Modified Files |
|-------|---------------|
| 01 | `Read.tsx` |
| 02 | `Single.tsx`, `LongStripImage.tsx`, `DoubleImage.tsx` |
| 03 | `ReadLayout.tsx`, `Header.tsx`, `ProgressBar.tsx`, `SubPanelChapter.tsx`, `SubPanelPage.tsx` |

No file appears in multiple phases.

## Phase Files

- [Phase 01 - Reader Data Fetching](./phase-01-reader-data-fetching.md)
- [Phase 02 - Reader Page Components](./phase-02-reader-page-components.md)
- [Phase 03 - Layout & Navigation Components](./phase-03-layout-navigation-components.md)

## Key Decisions
- **Data sharing**: Use React Context (`ReaderContext`) to share chapter data between Read.tsx and layout components (Header, ProgressBar, SubPanels) without prop drilling through layout boundaries
- **URL parsing**: Extract chapter number from URL param format `chapter-{number}` → `{number}`
- **Default language**: Fall back to `'en'` when lang param not provided
- **Total chapters**: Fetch via `useChapterList` with `limit: 1` to get `meta.total` without loading all chapters
- **No new files**: Only modify existing files (except ReaderContext provider)

## Unresolved Questions
- None — all APIs, hooks, and types are already implemented
