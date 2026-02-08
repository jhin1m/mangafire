# Phase 1: Shared Types & Validators

## Context

- [Plan](./plan.md) | [Backend Research](./research/researcher-backend-genre-filtering.md) | [Frontend Research](./research/researcher-frontend-tristate-checkbox.md)

## Parallelization Info

- **Sequential** -- must complete before Phase 2 and Phase 3 start
- **Blocks**: Phase 2, Phase 3
- **Blocked by**: None

## Overview

Extend shared package with `excludeGenres` query param type/validator and `GenreFilterState` type for tri-state UI.

## File Ownership

| File | Action |
|------|--------|
| `packages/shared/src/types/manga.ts` | Add `excludeGenres?: number[]` to `MangaQueryParams` |
| `packages/shared/src/types/filter.ts` | Add `GenreFilterState` type, add `state` field to `FilterDropdown` |
| `packages/shared/src/validators/manga.ts` | Add `excludeGenres` Zod field to `mangaQueryParamsSchema` |

## Key Insights

- `MangaQueryParams` already has `genreId?: number` for single-genre include. Keep it for backward compat.
- `FilterDropdown` currently has `checked?: boolean`. Add optional `state` field for tri-state without breaking existing usage.
- Validators use `z.coerce.number()` pattern for query params; `excludeGenres` needs comma-separated string-to-array coercion.

## Requirements

1. `MangaQueryParams.excludeGenres` -- optional `number[]` for genre IDs to exclude
2. `GenreFilterState` -- `'include' | 'exclude' | null` type for frontend tri-state
3. `FilterDropdown.state` -- optional `GenreFilterState` field
4. `mangaQueryParamsSchema.excludeGenres` -- Zod schema: comma-separated string -> number array, or absent

## Architecture

No structural changes. Three additive modifications to existing files.

## Implementation Steps

### Step 1: Update `MangaQueryParams` in `types/manga.ts`

```typescript
export interface MangaQueryParams {
  // ... existing fields unchanged
  excludeGenres?: number[]  // Genre IDs to exclude (NOT IN)
}
```

### Step 2: Update `FilterDropdown` and add `GenreFilterState` in `types/filter.ts`

```typescript
export type GenreFilterState = 'include' | 'exclude' | null

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean          // Keep for backward compat (non-genre filters)
  state?: GenreFilterState   // Tri-state for genre filter
}
```

### Step 3: Add `excludeGenres` to `mangaQueryParamsSchema` in `validators/manga.ts`

```typescript
// Comma-separated string → number array transform
excludeGenres: z.string().optional().transform((val) => {
  if (!val) return undefined
  return val.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
}),
```

## Todo

- [ ] Add `excludeGenres?: number[]` to `MangaQueryParams` interface
- [ ] Add `GenreFilterState` type export to `types/filter.ts`
- [ ] Add `state?: GenreFilterState` to `FilterDropdown` type
- [ ] Add `excludeGenres` field to `mangaQueryParamsSchema`
- [ ] Run `pnpm type-check` from root to verify no breakage

## Success Criteria

- `pnpm type-check` passes across all 3 packages
- `MangaQueryParams` includes `excludeGenres`
- `FilterDropdown` has optional `state` field
- Validator parses `excludeGenres=1,2,3` into `[1, 2, 3]` and absent value into `undefined`

## Conflict Prevention

- Only modifies `packages/shared/` files -- Phase 2 (api) and Phase 3 (web) never touch shared package
- All changes are additive (new fields/types); no breaking changes to existing interfaces

## Risk Assessment

- **Low risk**: Additive type changes only; no runtime impact until consumers use them
- **Zod transform**: Must handle edge cases (empty string, non-numeric values, negative numbers)

## Security Considerations

- Validator must reject non-positive integers to prevent invalid genre ID injection
- `filter(n => !isNaN(n) && n > 0)` ensures only valid positive IDs pass through

## Next Steps

After completion, Phase 2 and Phase 3 can start in parallel.
