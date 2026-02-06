# Phase 02: Move Frontend to apps/web

## Context Links
- [Plan](../plan.md) | [Research: Monorepo](../research/researcher-01-pnpm-monorepo-best-practices.md)

## Parallelization Info
- **Execution**: PARALLEL (with Phase 03, 04)
- **Blocked by**: Phase 01
- **Blocks**: Phase 05

## Overview

Move entire existing frontend into `apps/web/`. Create app-specific `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.eslint.json`. Update Vite config for monorepo context. Move `index.html`, `src/`, `public/`.

## Key Insights

- Current `@/` alias resolves to `src/` -- must keep working after move
- `tsconfig.json` has `"include": ["src", "./node_modules/redux-persist/types"]` -- redux-persist types include needed
- `vite.config.ts` uses `babel-plugin-macros` and `vite-plugin-dynamic-import`
- `index.html` references `/src/main.tsx` -- Vite resolves relative to project root (where `index.html` lives)
- `.eslintrc.cjs` at root extends to apps; app may need local override for `import/resolver` path
- `tsconfig.eslint.json` references `./tsconfig.json` and includes `vite.config.ts`

## Requirements

1. All files under `src/`, `public/`, `index.html` move to `apps/web/`
2. `apps/web/package.json` with all current FE deps + `@mangafire/shared` workspace dep
3. `apps/web/tsconfig.json` extends `../../tsconfig.base.json`, keeps `@/*` paths
4. Vite config updated: `resolve.dedupe` for react in monorepo
5. ESLint import resolver path updated for new location
6. Zero functional changes to FE behavior

## Architecture

```
apps/web/
├── index.html                    # MOVED from root
├── package.json                  # NEW (FE deps extracted from root)
├── tsconfig.json                 # NEW (extends base, FE-specific)
├── tsconfig.node.json            # MOVED from root
├── tsconfig.eslint.json          # NEW (adjusted paths)
├── vite.config.ts                # MOVED + MODIFIED
├── src/                          # MOVED from root (entire directory)
│   ├── @types/
│   ├── App.tsx
│   ├── assets/
│   ├── components/
│   ├── configs/
│   ├── constants/
│   ├── index.css
│   ├── main.tsx
│   ├── store/
│   ├── utils/
│   ├── views/
│   └── vite-env.d.ts
└── public/                       # MOVED from root
```

## Related Code Files (current state)

| File | Action | Notes |
|------|--------|-------|
| `src/` | MOVE to `apps/web/src/` | Entire directory as-is |
| `public/` | MOVE to `apps/web/public/` | Static assets |
| `index.html` | MOVE to `apps/web/` | No content changes needed |
| `vite.config.ts` | MOVE + MODIFY | Add `resolve.dedupe`, keep alias |
| `tsconfig.json` | DELETE from root; CREATE new in `apps/web/` | Extends base, keeps `@/*` |
| `tsconfig.node.json` | MOVE to `apps/web/` | Minimal changes |
| `tsconfig.eslint.json` | DELETE from root; CREATE new in `apps/web/` | Update paths |

## File Ownership

**This phase creates/modifies ONLY:**
- `apps/web/` directory (CREATE entire structure)
- `apps/web/package.json` (CREATE)
- `apps/web/tsconfig.json` (CREATE)
- `apps/web/tsconfig.node.json` (CREATE from moved file)
- `apps/web/tsconfig.eslint.json` (CREATE)
- `apps/web/vite.config.ts` (CREATE from moved + modified file)
- `apps/web/index.html` (MOVE)
- `apps/web/src/` (MOVE)
- `apps/web/public/` (MOVE)
- Root `tsconfig.json` (DELETE)
- Root `tsconfig.node.json` (DELETE)
- Root `tsconfig.eslint.json` (DELETE)
- Root `vite.config.ts` (DELETE)
- Root `index.html` (DELETE)
- Root `src/` (DELETE after move)
- Root `public/` (DELETE after move)

**DO NOT touch:** Root `package.json` (Phase 01), `packages/` (Phase 03), `apps/api/` (Phase 04), root `.eslintrc.cjs`, `.prettierrc`, `.husky/`

## Implementation Steps

### Step 1: Create `apps/web/` directory

```bash
mkdir -p apps/web
```

### Step 2: Move files

```bash
mv src apps/web/src
mv public apps/web/public
mv index.html apps/web/index.html
mv vite.config.ts apps/web/vite.config.ts
```

### Step 3: Create `apps/web/package.json`

Extract all deps from current root `package.json`:

```json
{
  "name": "@mangafire/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx,.js",
    "lint:fix": "eslint . --ext .ts,.tsx,.js --fix",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@mangafire/shared": "workspace:*",
    "@reduxjs/toolkit": "^1.9.7",
    "@tippyjs/react": "^4.2.6",
    "classnames": "^2.3.2",
    "lodash": "^4.17.21",
    "react": "^18.2.0",
    "react-device-detect": "^2.2.3",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "react-icons": "^4.11.0",
    "react-redux": "^8.1.3",
    "react-router-dom": "^6.18.0",
    "react-transition-group": "^4.4.5",
    "redux": "^4.2.1",
    "redux-persist": "^6.0.0",
    "swiper": "^11.0.3",
    "tippy.js": "^6.3.7"
  },
  "devDependencies": {
    "@types/lodash": "^4.14.200",
    "@types/node": "^20.8.10",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@types/react-transition-group": "^4.4.9",
    "@types/swipe": "^2.0.30",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.1.1",
    "@vitejs/plugin-react-swc": "^3.3.2",
    "babel-plugin-macros": "^3.1.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "vite": "^4.4.5",
    "vite-plugin-dynamic-import": "^1.5.0"
  }
}
```

**Note**: `@esbuild/linux-x64` removed (platform-specific, pnpm handles automatically). `@mangafire/shared` added as workspace dep.

### Step 4: Create `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "./node_modules/redux-persist/types"],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

### Step 5: Create `apps/web/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### Step 6: Create `apps/web/tsconfig.eslint.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"],
  "exclude": ["node_modules", "**/dist"]
}
```

### Step 7: Modify `apps/web/vite.config.ts`

Add `resolve.dedupe` for monorepo React deduplication:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-macros'],
      },
    }),
    dynamicImport(),
  ],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: './dist',
  },
})
```

### Step 8: Delete old root files

```bash
rm tsconfig.json tsconfig.node.json tsconfig.eslint.json
# src/, public/, index.html, vite.config.ts already moved
```

### Step 9: Update `.eslintrc.cjs` import resolver (if needed)

The root `.eslintrc.cjs` references `"project": "./tsconfig.eslint.json"`. Since ESLint runs from `apps/web/` via pnpm filter, and the resolver uses relative paths, may need an `apps/web/.eslintrc.cjs` that extends root:

```javascript
module.exports = {
  extends: ['../../.eslintrc.cjs'],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.eslint.json',
      },
    },
  },
}
```

## Todo List

- [ ] Create `apps/web/` directory
- [ ] Move `src/`, `public/`, `index.html` to `apps/web/`
- [ ] Move `vite.config.ts` to `apps/web/` and add `resolve.dedupe`
- [ ] Create `apps/web/package.json` with extracted deps + `@mangafire/shared`
- [ ] Create `apps/web/tsconfig.json` extending base
- [ ] Create `apps/web/tsconfig.node.json`
- [ ] Create `apps/web/tsconfig.eslint.json`
- [ ] Create `apps/web/.eslintrc.cjs` extending root
- [ ] Delete old root files: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.eslint.json`
- [ ] Verify `@/*` import alias still resolves

## Success Criteria

1. `pnpm --filter @mangafire/web run dev` starts Vite dev server
2. `pnpm --filter @mangafire/web run build` succeeds (tsc + vite build)
3. All `@/` path imports resolve correctly
4. ESLint runs without import resolver errors
5. No files remain at root that belong to FE app (except shared configs)

## Conflict Prevention

- Only this phase touches `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.eslint.json`
- Phase 01 handles root `package.json`; this phase creates separate `apps/web/package.json`
- Phase 03 creates `packages/shared/`; FE references via `workspace:*` dep but no file overlap

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@/*` paths break after move | High | `tsconfig.json` paths stay `./src/*` relative to `apps/web/` |
| redux-persist types include fails | Medium | Keep `./node_modules/redux-persist/types` in tsconfig include |
| ESLint resolver can't find tsconfig | Medium | Local `.eslintrc.cjs` with correct project path |
| Vite can't resolve `@mangafire/shared` | Medium | Verify workspace protocol + pnpm install |

## Security Considerations

- No secrets in FE configs
- `public/` assets are static, no sensitive data

## Next Steps

After Phase 02 + 03 + 04 complete, proceed to Phase 05 for integration testing.
