# pnpm Monorepo Best Practices Research

**Date:** 2026-02-06 | **Scope:** Frontend + Backend API setup

## 1. pnpm Workspaces Configuration

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json Scripts
```json
{
  "scripts": {
    "dev": "pnpm --filter './apps/*' -r --parallel run dev",
    "dev:web": "pnpm --filter=apps/web run dev",
    "dev:api": "pnpm --filter=apps/api run dev",
    "build": "pnpm --filter './apps/*' -r run build",
    "lint": "pnpm --filter './apps/*' -r run lint",
    "type-check": "pnpm --filter './apps/*' -r run type-check"
  }
}
```

**Key Benefits:**
- Single pnpm-lock.yaml for all packages
- Dependencies installed once, hard-linked via pnpm's content-addressable store
- Workspace protocol (workspace:*) prevents accidental external deps

## 2. Recommended Monorepo Structure

```
mangafire/
├── pnpm-workspace.yaml
├── package.json (root)
├── tsconfig.base.json
├── .eslintrc.cjs
├── apps/
│   ├── web/ (existing React+Vite)
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/ (new backend)
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
└── packages/
    └── shared/
        ├── src/
        │   ├── types/
        │   ├── constants/
        │   └── utils/
        ├── tsconfig.json
        └── package.json
```

## 3. Turborepo Decision for 1-3 Devs

**Verdict: START WITHOUT, ADD LATER**

### Start Simple (No Turborepo)
- **pnpm workspaces alone is sufficient** for small teams
- Single lock file + npm scripts = minimal config overhead
- Quick incremental adoption

### When to Add Turborepo Later
- Task caching becomes noticeably slow
- Parallel builds across many packages
- Team grows beyond 5 devs or packages > 5

### If Adding Turborepo (turbo.json)
```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"],
      "cache": true,
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false
    },
    "lint": {
      "cache": true
    }
  }
}
```

**Trade-off:** 20 lines of config vs. learning curve vs. marginal speed gains for 1-3 devs. **Skip unless pain arises.**

## 4. Shared TypeScript Types (packages/shared)

### packages/shared/package.json
```json
{
  "name": "@mangafire/shared",
  "version": "0.1.0",
  "private": true,
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

### packages/shared/tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

### Root tsconfig.base.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@mangafire/shared": ["packages/shared/src"]
    }
  }
}
```

### apps/web/tsconfig.json & apps/api/tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**Critical:** `references` field NOT inherited from `extends`. Must redeclare in each app.

### Type Sharing Best Practice
- Shared types in `packages/shared/src/types/`
- FE imports: `import type { User } from '@mangafire/shared'`
- BE imports: Same path (workspace protocol resolves correctly)
- No circular deps: shared → (web, api) only

## 5. Vite Config Changes for apps/web

### Before (Monorepo Root)
```typescript
resolve.alias: { '@': path.join(__dirname, 'src') }
build.outDir: './dist'
```

### After (apps/web)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'], // avoid dups in monorepo
  },
  build: {
    outDir: '../../dist/apps/web', // relative to workspace root
  },
})
```

### apps/web/package.json
- Update `dev`, `build` scripts (no change needed if using pnpm workspace)
- Add `@mangafire/shared` as workspace dependency: `"@mangafire/shared": "workspace:*"`

## 6. apps/api Setup (Express Example)

### apps/api/package.json
```json
{
  "name": "@mangafire/api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --loader ts-node/esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@mangafire/shared": "workspace:*",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

## Key Takeaways

| Aspect | Decision |
|--------|----------|
| Workspace Tool | **pnpm workspaces** (no Turborepo yet) |
| Structure | apps/(web, api) + packages/shared |
| Shared Types | tsconfig references + workspace protocol |
| Vite Outdir | Relative path: `../../dist/apps/web` |
| Lock File | Single root pnpm-lock.yaml |
| Team Scale | Sufficient for 1-3 devs; revisit at 5+ devs |

## Migration Path (Phased)

1. **Phase 1:** Move existing web app → apps/web, keep root files
2. **Phase 2:** Create packages/shared, extract common types
3. **Phase 3:** Create apps/api, share types from packages/shared
4. **Phase 4:** Evaluate Turborepo only if build times > 60s

---

## Sources

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [pnpm-workspace.yaml Configuration](https://pnpm.io/pnpm-workspace_yaml)
- [React Monorepo Setup with pnpm and Vite](https://dev.to/lico/react-monorepo-setup-tutorial-with-pnpm-and-vite-react-project-ui-utils-5705)
- [Full-Stack Monorepo: pnpm, React, Express](https://blog.stackademic.com/creating-a-simple-full-stack-application-with-monorepo-using-pnpm-react-express-and-docker-6346c08f8188)
- [Monorepo Decision: Turborepo vs Nx for Small Teams](https://medium.com/@ignatovich.dm/monorepos-with-turborepo-6aa0852708ee)
- [TypeScript Project References in Monorepos](https://nx.dev/blog/managing-ts-packages-in-monorepos)
- [Vite Config for Monorepo Apps](https://dev.to/tolu/vitejs-replacing-create-react-app-in-a-monorepo-31nd)

## Unresolved Questions

1. Will Express be used for API or Node.js framework (NestJS, Hono, Fastify)?
2. Should CI/CD pipeline cache builds with Turborepo from day one?
3. Are there existing shared utilities beyond types in the codebase?
