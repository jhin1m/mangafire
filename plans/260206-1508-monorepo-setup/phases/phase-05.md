# Phase 05: Integration and Verification

## Context Links
- [Plan](../plan.md) | [Phase 01](phase-01.md) | [Phase 02](phase-02.md) | [Phase 03](phase-03.md) | [Phase 04](phase-04.md)

## Parallelization Info
- **Execution**: LAST (sequential, after all others)
- **Blocked by**: Phase 01, 02, 03, 04
- **Blocks**: None

## Overview

Wire `@mangafire/shared` into both `apps/web` and `apps/api`. Update FE type imports to use shared package. Run full workspace install. Verify all dev commands, builds, and lint pass. Clean up duplicated types from FE.

## Key Insights

- FE `@types/common.ts` and `@types/theme.ts` have types now duplicated in `packages/shared`
- Must replace FE local types with imports from `@mangafire/shared` for shared types
- React-specific types (`CommonProps`, `CommonFilterProps`, `Route`, `MODAL_AUTH_ENUM`) remain in FE
- `pnpm install` at root regenerates lock file for entire workspace
- All `pnpm --filter` commands must work from workspace root

## Requirements

1. Update `apps/web/src/@types/common.ts` to re-export from `@mangafire/shared`
2. Update `apps/web/src/@types/theme.ts` to re-export shared reading types
3. Run `pnpm install` at workspace root
4. Verify `pnpm dev`, `pnpm build`, `pnpm lint` all work
5. Verify Docker Compose + API dev server
6. Verify FE dev server with shared package imports

## Architecture

No new directories. This phase modifies existing files in `apps/web/src/@types/` to import from shared.

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `apps/web/src/@types/common.ts` | MODIFY | Re-export shared types, keep FE-only types |
| `apps/web/src/@types/theme.ts` | MODIFY | Re-export shared reading types, keep FE-only |

## File Ownership

**This phase modifies ONLY:**
- `apps/web/src/@types/common.ts` (MODIFY -- replace shared types with re-exports)
- `apps/web/src/@types/theme.ts` (MODIFY -- replace shared types with re-exports)

**DO NOT touch:** Root configs (Phase 01), `apps/web/` structure (Phase 02), `packages/shared/` (Phase 03), `apps/api/` (Phase 04)

## Implementation Steps

### Step 1: Run `pnpm install` from workspace root

```bash
# From workspace root
pnpm install
```

This resolves all `workspace:*` dependencies and generates unified lock file.

### Step 2: Update `apps/web/src/@types/common.ts`

Replace shared types with re-exports; keep React-specific types local:

```typescript
import { ReactNode, CSSProperties } from 'react'

// Re-export shared types (source of truth: @mangafire/shared)
export {
  Genre,
  GenreTrending,
  Poster,
  EnumFilter,
  FilterDropdown,
  TableQueries,
  ENUM_READ_BY,
} from '@mangafire/shared'

// FE-only types (React dependencies)
export interface CommonProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
}

export type CommonFilterProps = {
  data: import('@mangafire/shared').FilterDropdown[]
  value: import('@mangafire/shared').EnumFilter
  onToggle: () => void
  open: boolean
  dropdownClassName?: string
  type?: 'checkbox' | 'radio'
}
```

### Step 3: Update `apps/web/src/@types/theme.ts`

```typescript
// Re-export shared reading types
export type { PageType, FitType, ReadDirectionType, ProgressOffsetType } from '@mangafire/shared'

// FE-only types
export type LayoutType = 'default' | 'read'
export type SubPanelType = 'chapter' | 'page' | 'comment' | null
```

### Step 4: Verify FE dev server

```bash
pnpm dev:web
# Expected: Vite starts on http://localhost:5173, no type errors
```

### Step 5: Verify FE build

```bash
pnpm --filter @mangafire/web run build
# Expected: tsc + vite build succeeds
```

### Step 6: Verify API dev server

```bash
# Start PostgreSQL
docker compose up -d

# Start API
pnpm dev:api
# Expected: Hono starts on http://localhost:3000

# Test health endpoint
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Step 7: Verify concurrent dev

```bash
pnpm dev
# Expected: Both web and api dev servers start in parallel
```

### Step 8: Verify lint and type-check

```bash
pnpm lint
pnpm type-check
# Expected: All apps and packages pass
```

### Step 9: Verify shared package type-check

```bash
pnpm --filter @mangafire/shared run type-check
# Expected: tsc --noEmit passes
```

### Step 10: Clean up old lock file

Delete old `pnpm-lock.yaml` if it still exists at root before first install (should be replaced by workspace-aware version).

## Todo List

- [ ] Run `pnpm install` at workspace root
- [ ] Update `apps/web/src/@types/common.ts` with shared re-exports
- [ ] Update `apps/web/src/@types/theme.ts` with shared re-exports
- [ ] Verify `pnpm dev:web` starts correctly
- [ ] Verify `pnpm --filter @mangafire/web run build` succeeds
- [ ] Verify `docker compose up -d` starts PostgreSQL
- [ ] Verify `pnpm dev:api` starts and health endpoint responds
- [ ] Verify `pnpm dev` runs both servers concurrently
- [ ] Verify `pnpm lint` passes across workspace
- [ ] Verify `pnpm type-check` passes across workspace

## Success Criteria

1. `pnpm install` completes without errors (single lock file)
2. `pnpm dev` starts both web (5173) and api (3000) servers
3. `pnpm build` succeeds for all apps
4. `pnpm lint` and `pnpm type-check` pass
5. FE app loads in browser with no runtime errors
6. API health endpoint returns 200
7. FE imports from `@mangafire/shared` resolve correctly
8. No duplicated type definitions (shared types come from single source)

## Conflict Prevention

- Only modifies 2 files in `apps/web/src/@types/`
- All other phases completed before this starts
- No structural changes, only import statement updates

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Workspace resolution fails | High | Verify `pnpm install` output; check workspace protocol |
| FE type imports break | Medium | Re-export pattern preserves existing import paths |
| Docker not installed | Low | Document Docker as dev prereq; API works without DB for health check |
| Version conflicts in workspace | Medium | pnpm strict mode catches conflicts; dedupe in Vite |

## Security Considerations

- Verify `.env` files are gitignored
- Verify no secrets committed during workspace setup
- Docker credentials are local-only defaults

## Next Steps

Monorepo setup complete. Future work:
- Build actual API routes (manga CRUD, chapters, auth)
- Add Hono RPC client to FE for type-safe API calls
- Add CI/CD pipeline for workspace builds
- Evaluate Turborepo if build times exceed 60s
