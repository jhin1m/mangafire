# Phase 03: Create packages/shared

## Context Links
- [Plan](../plan.md) | [Research: Monorepo](../research/researcher-01-pnpm-monorepo-best-practices.md) | [Research: Backend Stack](../research/researcher-02-backend-stack-selection.md)

## Parallelization Info
- **Execution**: PARALLEL (with Phase 02, 04)
- **Blocked by**: Phase 01
- **Blocks**: Phase 05

## Overview

Create `packages/shared` with extracted domain types and Zod validators. This package is the single source of truth for types shared between `apps/web` and `apps/api`. Uses workspace protocol for consumption.

## Key Insights

- Current FE types in `src/@types/`: `common.ts` (Genre, Poster, FilterDropdown, TableQueries), `theme.ts` (PageType, FitType, etc.), `routes.tsx` (Route -- React-specific, stays in FE), `modal.ts` (MODAL_AUTH_ENUM -- FE-specific, stays)
- Only **domain types** (Genre, Poster, TableQueries, enums for filtering) are shared; React-specific types stay in FE
- `theme.ts` types (PageType, FitType, etc.) are reading-config types -- potentially shared if API stores reading prefs
- Zod schemas provide runtime validation + TypeScript type inference (single definition)

## Requirements

1. `packages/shared/package.json` with `@mangafire/shared` name, workspace protocol exports
2. `packages/shared/tsconfig.json` extending base
3. Domain types extracted from FE `@types/common.ts`
4. Zod validators for shared domain types
5. Clean barrel exports via `src/index.ts`

## Architecture

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                   # Barrel export
    ├── types/
    │   ├── index.ts               # Re-export all types
    │   ├── manga.ts               # Genre, GenreTrending, Poster types
    │   ├── filter.ts              # EnumFilter, FilterDropdown, TableQueries
    │   └── reading.ts             # PageType, FitType, ReadDirection, etc.
    └── validators/
        ├── index.ts               # Re-export all validators
        ├── manga.ts               # Zod schemas for manga entities
        └── filter.ts              # Zod schemas for filter/query params
```

## Related Code Files (current state)

| Source File | Types to Extract | Stays in FE? |
|-------------|-----------------|--------------|
| `src/@types/common.ts` | `Genre`, `GenreTrending`, `Poster`, `EnumFilter`, `FilterDropdown`, `TableQueries`, `ENUM_READ_BY` | `CommonProps`, `CommonFilterProps` stay (React deps) |
| `src/@types/theme.ts` | `PageType`, `FitType`, `ReadDirectionType`, `ProgressOffsetType` | `LayoutType`, `SubPanelType` stay (FE-only) |
| `src/@types/routes.tsx` | None | All stay (React LazyExoticComponent dep) |
| `src/@types/modal.ts` | None | All stay (FE-only enum) |

## File Ownership

**This phase creates ONLY:**
- `packages/shared/` directory (CREATE entire structure)
- `packages/shared/package.json` (CREATE)
- `packages/shared/tsconfig.json` (CREATE)
- `packages/shared/src/index.ts` (CREATE)
- `packages/shared/src/types/index.ts` (CREATE)
- `packages/shared/src/types/manga.ts` (CREATE)
- `packages/shared/src/types/filter.ts` (CREATE)
- `packages/shared/src/types/reading.ts` (CREATE)
- `packages/shared/src/validators/index.ts` (CREATE)
- `packages/shared/src/validators/manga.ts` (CREATE)
- `packages/shared/src/validators/filter.ts` (CREATE)

**DO NOT touch:** `apps/web/src/@types/` (Phase 05 will update imports), `apps/api/` (Phase 04), root configs (Phase 01)

## Implementation Steps

### Step 1: Create directory structure

```bash
mkdir -p packages/shared/src/{types,validators}
```

### Step 2: Create `packages/shared/package.json`

```json
{
  "name": "@mangafire/shared",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./types": {
      "types": "./src/types/index.ts",
      "default": "./src/types/index.ts"
    },
    "./validators": {
      "types": "./src/validators/index.ts",
      "default": "./src/validators/index.ts"
    }
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

**Note**: No build step. Apps consume source directly via `exports` field pointing to `./src/`. This avoids a build pipeline for internal packages.

### Step 3: Create `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### Step 4: Create `packages/shared/src/types/manga.ts`

Extracted from `src/@types/common.ts`:

```typescript
export type Genre = {
  image: string
  type: string
  title: string
  chapters: {
    info: string
    date: string
    lang: null
  }[]
}

export type GenreTrending = {
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

export type Poster = {
  image: string
  title: string
  link?: string
}

export enum ENUM_READ_BY {
  CHAPTER = 'chapter',
  VOLUME = 'volume',
}
```

### Step 5: Create `packages/shared/src/types/filter.ts`

```typescript
export enum EnumFilter {
  'type' = 'type',
  'genre' = 'genre',
  'status' = 'status',
  'language' = 'language',
  'year' = 'year',
  'length' = 'length',
  'sort' = 'sort',
}

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean
}

export type TableQueries = {
  total?: number
  pageIndex?: number
  pageSize?: number
  query?: string
  sort?: {
    order: 'asc' | 'desc' | ''
    key: string | number
  }
}
```

### Step 6: Create `packages/shared/src/types/reading.ts`

```typescript
export type PageType = 'singlepage' | 'doublepage' | 'longstrip'
export type ProgressOffsetType = 'left' | 'right' | 'bottom' | 'top' | ''
export type ReadDirectionType = 'ltr' | 'rtl'
export type FitType = 'width' | 'height' | 'both' | 'no-limit'
```

### Step 7: Create `packages/shared/src/types/index.ts`

```typescript
export * from './manga'
export * from './filter'
export * from './reading'
```

### Step 8: Create `packages/shared/src/validators/manga.ts`

```typescript
import { z } from 'zod'

export const chapterInfoSchema = z.object({
  info: z.string(),
  date: z.string(),
  lang: z.null(),
})

export const genreSchema = z.object({
  image: z.string(),
  type: z.string(),
  title: z.string(),
  chapters: z.array(chapterInfoSchema),
})

export const genreTrendingSchema = z.object({
  image: z.string(),
  title: z.string(),
  desc: z.string(),
  releasing: z.string(),
  chapterAndVolume: z.string(),
  genres: z.array(z.string()),
})

export const posterSchema = z.object({
  image: z.string(),
  title: z.string(),
  link: z.string().optional(),
})
```

### Step 9: Create `packages/shared/src/validators/filter.ts`

```typescript
import { z } from 'zod'

export const tableQueriesSchema = z.object({
  total: z.number().optional(),
  pageIndex: z.number().optional(),
  pageSize: z.number().optional(),
  query: z.string().optional(),
  sort: z
    .object({
      order: z.enum(['asc', 'desc', '']),
      key: z.union([z.string(), z.number()]),
    })
    .optional(),
})

export const filterDropdownSchema = z.object({
  id: z.string().optional(),
  value: z.string(),
  label: z.string(),
  checked: z.boolean().optional(),
})
```

### Step 10: Create `packages/shared/src/validators/index.ts`

```typescript
export * from './manga'
export * from './filter'
```

### Step 11: Create `packages/shared/src/index.ts`

```typescript
export * from './types'
export * from './validators'
```

## Todo List

- [ ] Create `packages/shared/` directory structure
- [ ] Create `package.json` with Zod dep and workspace exports
- [ ] Create `tsconfig.json` extending base
- [ ] Extract domain types: `manga.ts`, `filter.ts`, `reading.ts`
- [ ] Create barrel exports for types
- [ ] Create Zod validators: `manga.ts`, `filter.ts`
- [ ] Create barrel exports for validators
- [ ] Create root `index.ts` barrel
- [ ] Run `tsc --noEmit` to verify types compile

## Success Criteria

1. `packages/shared` exists with all type and validator files
2. `tsc --noEmit` passes from `packages/shared/`
3. Barrel exports expose all types and validators
4. Zod schemas match TypeScript type definitions exactly
5. No React or FE-specific dependencies in shared package

## Conflict Prevention

- Only creates files under `packages/shared/`
- FE `@types/` files NOT modified here; Phase 05 updates FE imports to use shared package
- Shared types are **copies** initially; Phase 05 replaces FE originals with imports

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Type drift between shared and FE | Medium | Phase 05 replaces FE types with imports from shared |
| Zod schema mismatch with TS types | Low | Validators derived directly from type definitions |
| Missing type that API needs | Low | Add incrementally as API develops |

## Security Considerations

- No secrets or credentials in shared types
- Zod validators provide runtime input validation (security boundary for API)

## Next Steps

Phase 05 will update `apps/web` imports to use `@mangafire/shared` instead of local `@types/`.
