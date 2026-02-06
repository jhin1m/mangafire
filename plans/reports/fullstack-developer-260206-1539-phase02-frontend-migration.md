# Phase 02 Implementation Report

## Executed Phase
- Phase: phase-02-move-frontend-to-apps-web
- Plan: /Users/jhin1m/Desktop/ducanh-project/mangafire/plans/260206-1539-monorepo-migration
- Status: completed

## Files Modified

### Created (12 files):
- `apps/web/package.json` (1471 bytes)
- `apps/web/tsconfig.json` (321 bytes)
- `apps/web/tsconfig.node.json` (213 bytes)
- `apps/web/tsconfig.eslint.json` (164 bytes)
- `apps/web/.eslintrc.cjs` (210 bytes)
- `apps/web/vite.config.ts` (527 bytes) - added React dedupe
- `apps/web/src/` (moved from root)
- `apps/web/public/` (moved from root)
- `apps/web/index.html` (moved from root)

### Modified:
- `apps/web/src/store/slices/theme/themeSlice.ts`:
  - Added `Slice` import from @reduxjs/toolkit
  - Added explicit type annotation to `themeSlice: Slice<ThemeState>`
  - Fixed `setPreviousLayout` action type: `PayloadAction<LayoutType | undefined>`

### Deleted:
- `tsconfig.json` (root)
- `tsconfig.node.json` (root)
- `tsconfig.eslint.json` (root)
- `vite.config.ts` (root)
- `src/` (root)
- `public/` (root)
- `index.html` (root)

## Tasks Completed

- [x] Create `apps/web/` directory structure
- [x] Move `src/`, `public/`, `index.html`, `vite.config.ts` to `apps/web/`
- [x] Create `apps/web/package.json` with proper dependencies
- [x] Create `apps/web/tsconfig.json` extending base config
- [x] Create `apps/web/tsconfig.node.json`
- [x] Create `apps/web/tsconfig.eslint.json`
- [x] Create `apps/web/.eslintrc.cjs` extending root
- [x] Modify vite config to add React dedupe for monorepo
- [x] Delete old root tsconfig files
- [x] Fix TypeScript strict inference error in themeSlice

## Tests Status

- Type check: **PASS** ✓
  - Fixed immer type inference issue by adding explicit `Slice<ThemeState>` annotation
  - Fixed missing `PayloadAction` type on `setPreviousLayout` reducer
- Unit tests: N/A (no test runner configured)
- Integration tests: N/A

### Type Check Output:
```
> @mangafire/web@0.0.0 type-check
> tsc --noEmit

✓ No errors
```

## Issues Encountered

### ESLint Configuration
Root `.eslintrc.cjs` requires plugins (`eslint-plugin-import`, `eslint-plugin-react`, etc.) that aren't in root `package.json` devDependencies. Per phase instructions, root `package.json` is owned by Phase 01 and not modified here.

**Impact**: `pnpm lint` fails in `apps/web` due to missing plugins in workspace.

**Resolution Needed**: Phase 05 (Integration) should:
1. Add ESLint plugins to root `package.json` devDependencies, OR
2. Move ESLint config to workspace packages with proper plugin resolution

### TypeScript Inference Error
`themeSlice` had inferred type referencing non-portable immer internals.

**Resolution**: Added explicit `Slice<ThemeState>` type annotation.

## Architectural Notes

- Path alias `@/*` correctly resolves to `apps/web/src/*`
- `useDefineForClassFields: true` preserved from original config
- `redux-persist/types` included in tsconfig
- React/React-DOM dedupe configured in Vite for monorepo compatibility
- TypeScript project references configured (`tsconfig.node.json`)

## Next Steps

Phase 05 should:
1. Add ESLint plugins to root devDependencies
2. Run full integration tests across all apps
3. Verify `pnpm dev:web` starts correctly
4. Verify `pnpm build` produces valid output
5. Clean up `package-lock.json` (npm legacy file, pnpm-lock.yaml is canonical)

## Unresolved Questions

1. Should ESLint plugins be hoisted to root or kept in individual app devDependencies?
2. Should `.eslintrc.cjs` reference be updated to use workspace protocol for plugin resolution?
