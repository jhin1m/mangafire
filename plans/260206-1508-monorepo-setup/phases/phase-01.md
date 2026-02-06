# Phase 01: Root Workspace Setup

## Context Links
- [Plan](../plan.md) | [Research: Monorepo](../research/researcher-01-pnpm-monorepo-best-practices.md)

## Parallelization Info
- **Execution**: FIRST (sequential, blocks all others)
- **Blocked by**: None
- **Blocks**: Phase 02, 03, 04

## Overview

Create pnpm workspace root configuration. Transform current root `package.json` into workspace orchestrator. Create shared `tsconfig.base.json`. Update `.gitignore` for monorepo patterns.

## Key Insights

- Current `package.json` has `name: "manga"`, `type: "module"`, contains all FE deps
- Current `tsconfig.json` has `@/*` path alias and `noEmit: true`
- `.gitignore` needs monorepo-specific patterns (multiple dist dirs, docker volumes)
- Husky commit-msg hook uses `npx commitlint`; must keep working from root

## Requirements

1. `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
2. Root `package.json` as workspace orchestrator (no app deps, only devDeps for tooling)
3. `tsconfig.base.json` with shared compiler options
4. Updated `.gitignore` with monorepo patterns
5. Existing husky/commitlint/prettier configs remain at root, functional

## Architecture

```
mangafire/
├── pnpm-workspace.yaml          # NEW
├── package.json                  # MODIFIED (workspace root)
├── tsconfig.base.json            # NEW
├── .gitignore                    # MODIFIED
├── .eslintrc.cjs                 # UNCHANGED (stays at root)
├── .prettierrc                   # UNCHANGED
├── .prettierignore               # MODIFIED (add monorepo paths)
├── .eslintignore                 # MODIFIED (add monorepo paths)
├── commitlint.config.cjs         # UNCHANGED
├── .husky/commit-msg             # UNCHANGED
```

## Related Code Files (current state)

| File | Current Purpose | Action |
|------|----------------|--------|
| `package.json` | Single-app with all deps | Strip to workspace root |
| `tsconfig.json` | FE config with `@/*` paths | Will be moved in Phase 02 |
| `.gitignore` | Basic Vite ignores | Add monorepo patterns |
| `.prettierignore` | Basic ignores | Add `apps/*/dist`, `packages/*/dist` |
| `.eslintignore` | `node_modules/`, `dist/` | Add monorepo paths |

## File Ownership

**This phase creates/modifies ONLY:**
- `pnpm-workspace.yaml` (CREATE)
- `package.json` (MODIFY - workspace root version)
- `tsconfig.base.json` (CREATE)
- `.gitignore` (MODIFY)
- `.prettierignore` (MODIFY)
- `.eslintignore` (MODIFY)

**DO NOT touch:** `tsconfig.json`, `tsconfig.node.json`, `tsconfig.eslint.json`, `vite.config.ts`, `.eslintrc.cjs`, `index.html`, `src/`, `public/`, `.husky/`, `commitlint.config.cjs`, `.prettierrc`

## Implementation Steps

### Step 1: Create `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Step 2: Create `tsconfig.base.json`

Extract shared compiler options from current `tsconfig.json`. This becomes the base config all apps/packages extend.

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**Note**: `jsx`, `paths`, `include`, `references` are NOT in base -- they're app-specific.

### Step 3: Rewrite root `package.json`

Transform from single-app to workspace root. Keep only:
- Workspace-level scripts (filter-based)
- Root devDeps: husky, commitlint, eslint, prettier, typescript
- Remove ALL runtime deps (move to Phase 02)

```json
{
  "name": "mangafire",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter './apps/*' -r --parallel run dev",
    "dev:web": "pnpm --filter @mangafire/web run dev",
    "dev:api": "pnpm --filter @mangafire/api run dev",
    "build": "pnpm --filter './apps/*' -r run build",
    "lint": "pnpm --filter './apps/*' -r run lint",
    "type-check": "pnpm --filter './apps/*' -r run type-check",
    "format": "prettier --write \"apps/*/src/**/*.{ts,tsx}\" \"packages/*/src/**/*.ts\"",
    "commitlint": "commitlint --edit",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.4.2",
    "@commitlint/config-conventional": "^18.4.2",
    "eslint": "^8.45.0",
    "husky": "^8.0.3",
    "prettier": "^3.0.0",
    "typescript": "^5.0.2"
  }
}
```

### Step 4: Update `.gitignore`

Append monorepo patterns:

```gitignore
# Monorepo
apps/*/dist
packages/*/dist
.env
.env.*
!.env.example

# Docker
docker-compose.override.yml
pgdata/
```

### Step 5: Update `.prettierignore`

Add monorepo-aware paths:

```
apps/*/dist/
packages/*/dist/
```

### Step 6: Update `.eslintignore`

Add monorepo paths:

```
apps/*/dist/
packages/*/dist/
```

### Step 7: Delete `pnpm-lock.yaml` (will regenerate)

After all phases complete, `pnpm install` at root regenerates the lock file for the workspace.

## Todo List

- [ ] Create `pnpm-workspace.yaml`
- [ ] Create `tsconfig.base.json`
- [ ] Rewrite root `package.json` (workspace orchestrator)
- [ ] Update `.gitignore` with monorepo patterns
- [ ] Update `.prettierignore`
- [ ] Update `.eslintignore`
- [ ] Verify husky/commitlint still configured correctly

## Success Criteria

1. `pnpm-workspace.yaml` exists with `apps/*` and `packages/*`
2. Root `package.json` has NO runtime deps, only workspace scripts + tooling devDeps
3. `tsconfig.base.json` has shared TS options (no JSX, no paths)
4. `.gitignore` covers monorepo dist patterns + Docker volumes
5. All root configs (eslint, prettier, commitlint, husky) remain functional

## Conflict Prevention

- Root `package.json` is ONLY modified here. Phase 02 creates `apps/web/package.json`
- `tsconfig.json` (current) is NOT touched here; Phase 02 moves/rewrites it
- `.eslintrc.cjs` is NOT touched; stays as-is at root

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lock file conflicts | Medium | Delete `pnpm-lock.yaml`, regenerate after all phases |
| Husky path breaks | Low | Husky resolves from git root; root unchanged |
| ESLint import resolver breaks | Medium | `tsconfig.eslint.json` path updated in Phase 02 |

## Security Considerations

- `.env` files added to `.gitignore` (DB credentials, API keys)
- No secrets in workspace root configs

## Next Steps

After Phase 01 completes, Phases 02, 03, 04 can start in parallel.
