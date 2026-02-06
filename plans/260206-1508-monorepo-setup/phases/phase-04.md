# Phase 04: Create apps/api Scaffold

## Context Links
- [Plan](../plan.md) | [Research: Backend Stack](../research/researcher-02-backend-stack-selection.md)

## Parallelization Info
- **Execution**: PARALLEL (with Phase 02, 03)
- **Blocked by**: Phase 01
- **Blocks**: Phase 05

## Overview

Scaffold `apps/api` with Hono framework, Drizzle ORM config, PostgreSQL Docker Compose setup. Minimal working API with health endpoint. No business logic -- just infrastructure scaffolding.

## Key Insights

- Hono chosen for lightweight CRUD, type-safe RPC with `hono/client`
- Drizzle chosen for code-first schema, no generation step
- PostgreSQL via Docker Compose for local dev (no manual DB setup)
- `tsx` for dev server (fast TS execution, watch mode)
- API runs on port 3000; Vite dev server on 5173 (no conflict)

## Requirements

1. `apps/api/package.json` with Hono, Drizzle, PostgreSQL deps
2. `apps/api/tsconfig.json` extending base (no JSX, Node target)
3. Hono entry point with health check route
4. Drizzle config pointing to PostgreSQL
5. Basic DB schema file (placeholder)
6. Docker Compose with PostgreSQL service
7. `.env.example` for API environment variables

## Architecture

```
apps/api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
└── src/
    ├── index.ts                   # Hono app entry point
    ├── routes/
    │   └── health.ts              # Health check route
    ├── db/
    │   ├── client.ts              # Drizzle + PostgreSQL connection
    │   └── schema.ts              # Drizzle schema (placeholder)
    └── middleware/
        └── cors.ts                # CORS middleware for FE dev

docker-compose.yml                 # At workspace root
```

## Related Code Files

This phase creates entirely new files. No existing files are modified.

## File Ownership

**This phase creates ONLY:**
- `apps/api/` directory (CREATE entire structure)
- `apps/api/package.json` (CREATE)
- `apps/api/tsconfig.json` (CREATE)
- `apps/api/drizzle.config.ts` (CREATE)
- `apps/api/.env.example` (CREATE)
- `apps/api/src/index.ts` (CREATE)
- `apps/api/src/routes/health.ts` (CREATE)
- `apps/api/src/db/client.ts` (CREATE)
- `apps/api/src/db/schema.ts` (CREATE)
- `apps/api/src/middleware/cors.ts` (CREATE)
- `docker-compose.yml` at workspace root (CREATE)

**DO NOT touch:** `apps/web/` (Phase 02), `packages/shared/` (Phase 03), root configs (Phase 01)

## Implementation Steps

### Step 1: Create directory structure

```bash
mkdir -p apps/api/src/{routes,db,middleware}
```

### Step 2: Create `apps/api/package.json`

```json
{
  "name": "@mangafire/api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@mangafire/shared": "workspace:*",
    "@hono/node-server": "^1.8.0",
    "hono": "^4.0.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.8.10",
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.7.0"
  }
}
```

**Note**: Uses `postgres` (postgres.js) driver, not `pg` -- faster, pure JS, no native bindings. `@hono/node-server` for Node.js runtime adapter.

### Step 3: Create `apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "lib": ["ES2022"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Note**: No `DOM` lib (server-side). `moduleResolution: "bundler"` for ESM + workspace imports. `noEmit: false` to enable `tsc` build.

### Step 4: Create `apps/api/src/index.ts`

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
)

app.route('/api/health', healthRoutes)

const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
```

### Step 5: Create `apps/api/src/routes/health.ts`

```typescript
import { Hono } from 'hono'

export const healthRoutes = new Hono()

healthRoutes.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

### Step 6: Create `apps/api/src/db/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://mangafire:mangafire@localhost:5432/mangafire'

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

### Step 7: Create `apps/api/src/db/schema.ts`

Placeholder schema -- will be expanded when building actual features:

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// Placeholder table to verify Drizzle setup works
export const healthChecks = pgTable('health_checks', {
  id: serial('id').primaryKey(),
  status: text('status').notNull().default('ok'),
  checkedAt: timestamp('checked_at').defaultNow(),
})
```

### Step 8: Create `apps/api/drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://mangafire:mangafire@localhost:5432/mangafire',
  },
} satisfies Config
```

### Step 9: Create `apps/api/.env.example`

```env
PORT=3000
DATABASE_URL=postgresql://mangafire:mangafire@localhost:5432/mangafire
```

### Step 10: Create `apps/api/src/middleware/cors.ts`

```typescript
// CORS is configured inline in index.ts using hono/cors
// This file reserved for custom middleware (auth, logging, etc.)

export {}
```

### Step 11: Create `docker-compose.yml` at workspace root

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mangafire-db
    environment:
      POSTGRES_USER: mangafire
      POSTGRES_PASSWORD: mangafire
      POSTGRES_DB: mangafire
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Todo List

- [ ] Create `apps/api/` directory structure
- [ ] Create `package.json` with Hono, Drizzle, postgres deps
- [ ] Create `tsconfig.json` extending base (server-side config)
- [ ] Create `src/index.ts` Hono entry with CORS
- [ ] Create `src/routes/health.ts` health check route
- [ ] Create `src/db/client.ts` Drizzle + postgres.js connection
- [ ] Create `src/db/schema.ts` placeholder schema
- [ ] Create `drizzle.config.ts`
- [ ] Create `.env.example`
- [ ] Create `docker-compose.yml` at workspace root
- [ ] Create placeholder `src/middleware/cors.ts`

## Success Criteria

1. `docker compose up -d` starts PostgreSQL on port 5432
2. `pnpm --filter @mangafire/api run dev` starts Hono on port 3000
3. `GET http://localhost:3000/api/health` returns `{"status":"ok"}`
4. `tsc --noEmit` passes in `apps/api/`
5. Drizzle config validates (`drizzle-kit push` works with running DB)

## Conflict Prevention

- Only creates files under `apps/api/` and root `docker-compose.yml`
- No overlap with Phase 02 (apps/web) or Phase 03 (packages/shared)
- Root `docker-compose.yml` is new file, not touched by any other phase

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Port 5432 already in use | Low | Docker maps to host; user can change in compose |
| postgres.js ESM import issues | Medium | tsx handles ESM natively; verify with `tsx watch` |
| Drizzle version compatibility | Low | Pin versions; drizzle-orm and drizzle-kit must match |

## Security Considerations

- `.env.example` uses local-only credentials (not production secrets)
- `.env` already in `.gitignore` (Phase 01)
- CORS restricted to `localhost:5173` in dev
- Docker PostgreSQL not exposed beyond localhost

## Next Steps

Phase 05 wires `@mangafire/shared` imports into both apps and verifies full dev workflow.
