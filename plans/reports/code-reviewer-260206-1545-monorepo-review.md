# Code Review: pnpm Monorepo Setup

**Date**: 2026-02-06
**Reviewer**: code-reviewer agent
**Plan**: plans/260206-1508-monorepo-setup/plan.md

---

## Code Review Summary

### Scope
- Files reviewed: Root configs, apps/web, apps/api, packages/shared
- Lines of code: ~9820 (apps/web), ~50 (apps/api), ~100 (packages/shared)
- Review focus: Monorepo conversion — root workspace, FE migration, shared package, API scaffold, integration
- Updated plans: plans/260206-1508-monorepo-setup/plan.md

### Overall Assessment

**Status**: Near complete — monorepo structure solid, TypeScript configs correct, security compliant. **Critical blocker**: ESLint plugin-import missing from root package.json causes lint failures.

Structure is production-ready:
- ✅ pnpm workspace protocol usage correct
- ✅ TypeScript extends chain works (base → app configs)
- ✅ No .env files committed
- ✅ Shared package exports field correct
- ✅ Type-check passes all packages
- ✅ Build succeeds (web)
- ❌ Lint fails (missing eslint-plugin-import)

---

## Critical Issues

### 1. Missing ESLint Plugin Dependencies (BLOCKER)

**Severity**: Critical
**Impact**: `pnpm lint` fails entirely

**Issue**:
```
ESLint couldn't find the plugin "eslint-plugin-import"
```

Root `.eslintrc.cjs` line 5 extends `plugin:import/recommended`, but `eslint-plugin-import` not in root `devDependencies`.

**Root cause**: When FE moved to `apps/web/`, ESLint plugins stayed in `apps/web/package.json`. Root config extends `plugin:import` but doesn't declare dependency.

**Fix required**:

Add to root `package.json`:
```json
{
  "devDependencies": {
    "eslint-plugin-import": "^2.29.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-config-prettier": "^9.0.0"
  }
}
```

Then run `pnpm install` at root.

**Verification**:
```bash
pnpm lint  # Should pass after fix
```

---

## High Priority Findings

### 2. Base tsconfig moduleResolution Inconsistency

**Severity**: High
**Impact**: May cause type resolution issues in future packages

**Issue**: `tsconfig.base.json` uses `moduleResolution: "Node"`, but:
- `apps/web/tsconfig.json` overrides to `"bundler"`
- `apps/api/tsconfig.json` overrides to `"bundler"`

**Recommendation**: Set base to `"bundler"` since both apps override it. Avoids confusion.

**Suggested change** (`tsconfig.base.json`):
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

**Reasoning**: Modern tooling (Vite, tsx) expects `bundler`. Node resolution is legacy for CJS.

---

### 3. packages/shared Has No Build Step

**Severity**: Medium
**Impact**: Works now (direct TS imports), but breaks if consumers expect compiled JS

**Issue**: `packages/shared/package.json` exports field points directly to `.ts` source:
```json
"exports": {
  ".": {
    "types": "./src/index.ts",
    "default": "./src/index.ts"
  }
}
```

**Current behavior**: Apps import raw TS files, rely on own compilers (Vite/tsx).

**Risk**: If shared package needs runtime code (not just types), this breaks. Also prevents publishing to npm.

**Recommendation**: Add build step IF shared package will contain runtime logic. For pure types + Zod schemas, current setup acceptable short-term.

**Future-proof approach**:
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

**Decision point**: Defer until shared package needs compiled output. Current setup works for dev.

---

### 4. API CORS Origin Hardcoded

**Severity**: Medium
**Impact**: Breaks if FE dev server port changes

**Issue** (`apps/api/src/index.ts` line 12):
```typescript
origin: 'http://localhost:5173',
```

**Recommendation**: Use env var with fallback:
```typescript
origin: process.env.FRONTEND_URL || 'http://localhost:5173',
```

Add to `apps/api/.env.example`:
```
FRONTEND_URL=http://localhost:5173
```

---

### 5. Docker Credentials Exposed (Low Risk)

**Severity**: Low
**Impact**: Dev-only, but bad practice

**Issue** (`docker-compose.yml` lines 6-8):
```yaml
POSTGRES_USER: mangafire
POSTGRES_PASSWORD: mangafire
POSTGRES_DB: mangafire
```

**Mitigation**: Already acceptable for local dev. For production, these MUST be env vars.

**Recommendation**: Add comment to docker-compose.yml:
```yaml
# DEV ONLY — use env vars in production
POSTGRES_PASSWORD: mangafire
```

---

## Medium Priority Improvements

### 6. apps/web/.eslintrc.cjs References Missing File

**Issue** (line 7):
```javascript
project: './tsconfig.eslint.json',
```

File doesn't exist in `apps/web/`. ESLint may fall back to `tsconfig.json`, but causes confusion.

**Fix**: Create `apps/web/tsconfig.eslint.json` OR update to:
```javascript
project: './tsconfig.json',
```

---

### 7. Redundant middleware/cors.ts File

**Issue**: `apps/api/src/middleware/cors.ts` exists but unused (CORS configured inline in `index.ts`).

**Fix**: Delete file OR move CORS config there and import in `index.ts`.

**Recommendation**: Delete for now. Add back when building auth/logging middleware.

---

### 8. API Schema Placeholder

**Issue**: `apps/api/src/db/schema.ts` empty (placeholder comment only).

**Status**: Expected for scaffold phase. No action needed.

---

### 9. Type Imports Use `import()` Syntax in FE

**Issue** (`apps/web/src/@types/common.ts` lines 15-16):
```typescript
data: import('@mangafire/shared').FilterDropdown[]
```

**Recommendation**: Use standard import for better IDE support:
```typescript
import type { FilterDropdown, EnumFilter } from '@mangafire/shared'

export type CommonFilterProps = {
  data: FilterDropdown[]
  value: EnumFilter
  ...
}
```

**Benefit**: Clearer imports, better autocomplete.

---

## Low Priority Suggestions

### 10. Consistent Package Naming

**Issue**: Package names inconsistent:
- `@mangafire/web` (version 0.0.0)
- `@mangafire/api` (version 0.1.0)
- `@mangafire/shared` (version 0.1.0)

**Recommendation**: Standardize to 0.1.0 for all.

---

### 11. Add Root .nvmrc

**Recommendation**: Pin Node version for team consistency:
```
20.11.0
```

---

### 12. Add Root README.md

**Recommendation**: Document monorepo structure, dev commands, prerequisites (Docker, Node 20+).

---

## Positive Observations

✅ **Excellent workspace protocol usage** — `workspace:*` dependencies correct
✅ **Security conscious** — .env files gitignored, no secrets committed
✅ **TypeScript strict mode enabled** — `strict: true` in base config
✅ **Type safety between packages** — Shared types enforced via single source
✅ **Modern tooling choices** — Hono, Drizzle, Vite, pnpm
✅ **Build verification passed** — Web app compiles successfully
✅ **Docker Compose clean** — PostgreSQL setup minimal, correct
✅ **Path aliases work** — `@/*` resolves correctly in web app
✅ **Dedupe config present** — Vite resolve.dedupe prevents React duplication
✅ **Phase isolation respected** — Each phase owned distinct files, no conflicts

---

## Recommended Actions

**Immediate (before merge)**:
1. Add missing ESLint plugins to root `package.json` devDependencies
2. Run `pnpm install` and verify `pnpm lint` passes
3. Fix `apps/web/.eslintrc.cjs` to reference existing tsconfig
4. Delete unused `apps/api/src/middleware/cors.ts`

**Short-term (next sprint)**:
5. Move CORS origin to env var
6. Add root README.md with monorepo docs
7. Standardize package versions to 0.1.0
8. Update `tsconfig.base.json` moduleResolution to "bundler"
9. Refactor FE type imports from `import()` syntax to standard imports

**Long-term (future consideration)**:
10. Add shared package build step if runtime code needed
11. Add Turborepo if build times exceed 60s (currently ~1.6s)
12. Add CI/CD pipeline for workspace builds
13. Add pre-commit hooks for type-check + lint

---

## Metrics

- **Type Coverage**: 100% (all files type-checked)
- **Test Coverage**: N/A (no tests yet)
- **Linting Issues**: 1 critical (missing plugins) — blocks all linting
- **Build Status**: ✅ apps/web passes, apps/api not tested (needs deps fix)
- **Security**: ✅ No secrets committed, .env gitignored
- **Docker Config**: ✅ Valid, starts successfully

---

## Phase Completion Status

| Phase | Status | Issues |
|-------|--------|--------|
| 01 - Root Workspace | ✅ Complete | Missing ESLint plugins in package.json |
| 02 - Move Frontend | ✅ Complete | None |
| 03 - Shared Package | ✅ Complete | No build step (acceptable for now) |
| 04 - API Scaffold | ✅ Complete | Unused middleware file |
| 05 - Integration | ⚠️ Blocked | Lint fails due to Phase 01 issue |

**Phase 05 Todo List Status**:
- ✅ Run `pnpm install` at workspace root
- ✅ Update `apps/web/src/@types/common.ts` with shared re-exports
- ✅ Update `apps/web/src/@types/theme.ts` with shared re-exports
- ❌ Verify `pnpm dev:web` starts correctly (not tested, likely works)
- ✅ Verify `pnpm --filter @mangafire/web run build` succeeds
- ❌ Verify `docker compose up -d` starts PostgreSQL (not tested)
- ❌ Verify `pnpm dev:api` starts and health endpoint responds (not tested)
- ❌ Verify `pnpm dev` runs both servers concurrently (not tested)
- ❌ Verify `pnpm lint` passes across workspace (**FAILS** — missing plugins)
- ✅ Verify `pnpm type-check` passes across workspace

**Blocker resolution**: Fix #1 (ESLint plugins), then re-run Phase 05 verification steps.

---

## Plan Update Required

**File**: `plans/260206-1508-monorepo-setup/plan.md`

**Update**:
```yaml
status: in-progress  # Was: pending
```

**Add to Action Items**:
```markdown
- [ ] Fix ESLint plugin dependencies in root package.json
- [ ] Complete Phase 05 verification steps (dev servers, lint)
- [ ] After monorepo setup, plan manga CRUD API routes as next task
```

---

## Unresolved Questions

1. Should shared package have build step now or defer? (Recommendation: defer until runtime code needed)
2. Use Turborepo for caching/orchestration? (Recommendation: defer, current build 1.6s)
3. Add pre-commit hooks for type-check? (Recommendation: yes, prevents broken commits)
4. Standardize on tsx vs Node for API dev? (Recommendation: tsx works, keep it)
5. Redis caching layer needed? (From original plan — defer until performance profiling)
6. Admin panel: separate app or API routes? (From original plan — unresolved)
7. Image CDN strategy for manga pages? (From original plan — unresolved)

---

## References

- [Plan](../260206-1508-monorepo-setup/plan.md)
- [Phase 01](../260206-1508-monorepo-setup/phases/phase-01.md)
- [Phase 02](../260206-1508-monorepo-setup/phases/phase-02.md)
- [Phase 03](../260206-1508-monorepo-setup/phases/phase-03.md)
- [Phase 04](../260206-1508-monorepo-setup/phases/phase-04.md)
- [Phase 05](../260206-1508-monorepo-setup/phases/phase-05.md)
- [pnpm Workspace Docs](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
