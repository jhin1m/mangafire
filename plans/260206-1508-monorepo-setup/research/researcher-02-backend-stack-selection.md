# Backend Stack Selection for Manga Reader API in pnpm Monorepo

## Executive Summary
**Recommendation**: Hono + Drizzle + PostgreSQL in `apps/api/` with Turborepo for concurrent dev servers.

Hono matches manga reader API requirements (lightweight CRUD, edge-compatible, 25k req/sec), Drizzle provides TypeScript-first ORM with zero-runtime overhead, PostgreSQL handles concurrent metadata queries. Setup enables both FE (Vite HMR) and BE (Node/Bun) running simultaneously in monorepo.

---

## 1. Framework Comparison

| Aspect | Hono | Fastify | Express |
|--------|------|---------|---------|
| **Perf (req/sec)** | 25,000 | 30,000 | 15,000 |
| **Bundle Size** | 14kB (tiny) | ~50kB | ~40kB |
| **Memory** | -40% vs Express | -30% vs Express | baseline |
| **Runtime Support** | Node, Deno, Bun, Workers | Node only | Node only |
| **Learning Curve** | Minimal | Moderate | Simple (legacy) |
| **DX** | Excellent (middleware chain) | Good | Legacy patterns |

### Decision: **Hono**

**Why**:
- Tiny footprint crucial for monorepo (lower CI/CD overhead)
- Web Standards-based = future-proof, minimal vendor lock-in
- Built-in validation (Hono Validator + Zod integration)
- RPC mode with client type-safety (`hono/client` auto-generates types)
- Cold-start friendly (serverless migration path if needed later)
- CRUD for manga/chapters/images = simple REST routes (Hono excels here)

**Fastify** is 2x faster but overkill for manga metadata API; **Express** legacy ecosystem doesn't justify adoption in new greenfield project.

---

## 2. ORM Comparison

| Aspect | Drizzle | Prisma |
|--------|---------|--------|
| **Query Speed** | 100x faster (SQLite), faster overall | Small overhead, negligible for CRUD |
| **Type Safety** | Full (code-first, TS inference) | Full (schema-first, generated) |
| **Bundle Size** | ~50kB (minimal) | ~500kB (larger) |
| **Dev Loop** | Fast (no generation step) | Code generation step required |
| **SQL Control** | Full (transparent SQL) | Abstracted (less control) |
| **Serverless Ready** | Yes (smaller footprint) | Yes (but larger) |

### Decision: **Drizzle**

**Why**:
- Code-first = schema lives in `src/` as TypeScript
- No schema file = simpler monorepo sharing (types directly importable)
- Transparent SQL = easier debugging, better performance monitoring
- Better for manga metadata queries (chapters, image references)
- Bundle size matters in monorepo builds

**Prisma** is more beginner-friendly but its abstraction + generation step adds friction for manga API (simple relational queries don't need abstraction).

---

## 3. Database Selection

| Aspect | PostgreSQL | SQLite |
|--------|-----------|--------|
| **Concurrency** | MVCC (unlimited writers) | Single writer (file-locked) |
| **Production Multi-User** | Yes | No |
| **Setup Complexity** | Moderate (separate server) | Minimal (file-based) |
| **Scalability** | Horizontal (via replicas) | Single-instance only |

### Decision: **PostgreSQL**

**Why**:
- Manga reader = public API (multiple concurrent users reading/filtering)
- SQLite bottleneck: only 1 writer at a time (breaks under load)
- PostgreSQL MVCC = readers don't block writers (critical for user queries + admin updates)
- Docker Compose setup in monorepo = trivial (`postgres` service)
- Future-proof if API scales

**SQLite** acceptable only for local dev or single-user internal tools; manga reader needs multi-user concurrency.

---

## 4. Project Structure in Monorepo

```
mangafire/
├── apps/
│   ├── web/                    # Existing React+Vite frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                    # NEW: Hono backend
│       ├── src/
│       │   ├── index.ts              # Hono app entry
│       │   ├── routes/               # API routes
│       │   │   ├── manga.ts
│       │   │   ├── chapters.ts
│       │   │   └── auth.ts
│       │   ├── db/
│       │   │   ├── schema.ts         # Drizzle schema (code-first)
│       │   │   └── client.ts         # DB connection
│       │   ├── middleware/
│       │   ├── services/
│       │   └── types/
│       ├── package.json
│       ├── tsconfig.json
│       └── drizzle.config.ts
│
├── packages/                   # OPTIONAL: Shared code
│   └── shared/                 # Types, validation (manga, chapter, user)
│       ├── src/
│       │   ├── types/
│       │   └── validators/     # Zod schemas (reusable)
│       └── package.json
│
├── package.json               # Root workspace config
├── pnpm-workspace.yaml        # Defines apps/* and packages/*
├── docker-compose.yml         # PostgreSQL + Redis (cache)
└── turbo.json                # Task orchestration (optional, useful)
```

**Key Decisions**:
- `apps/web/` = existing React frontend (no changes)
- `apps/api/` = new Hono backend
- `packages/shared/` = Zod validators + types (both FE/BE import)
  - Shared validation = single source of truth
  - Web client can use `hono/client` RPC mode for type-safe API calls
- Monorepo avoids API schema duplication (FE + BE always in sync)

---

## 5. Development Workflow

### Setup Steps

**1. Initialize Hono in monorepo** (after confirming apps/api structure):
```bash
cd apps/api
npm init hono .
```

**2. Install dependencies**:
```bash
pnpm install
```

**3. Concurrent dev servers** (root `package.json`):
```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:web": "pnpm --filter web run dev",
    "dev:api": "pnpm --filter api run dev",
    "build": "turbo run build",
    "db:push": "pnpm --filter api run db:push"
  }
}
```

**4. App-level scripts** (`apps/api/package.json`):
```json
{
  "scripts": {
    "dev": "wrangler dev || tsx watch src/index.ts",
    "build": "tsc && vite build",
    "db:push": "drizzle-kit push:pg",
    "db:generate": "drizzle-kit generate:pg"
  }
}
```

### Running Both Servers

```bash
# Terminal 1: Run both concurrently
pnpm dev

# OR run separately
pnpm dev:web   # Vite on http://localhost:5173
pnpm dev:api   # Hono on http://localhost:3000
```

**Turborepo Benefits**:
- Parallelizes dev servers across cores
- Caches builds (0.2s rebuild after initial)
- Unified logs with prefixes (web: ..., api: ...)

### API Development with Type Safety

```typescript
// apps/api/src/routes/manga.ts
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { createManga, getMangaList } from '../services/manga'
import { mangaSchema } from '@manga/shared' // From packages/shared

const api = new Hono()

api.post('/', validator('json', mangaSchema.create), async (c) => {
  const data = c.req.valid('json')
  const manga = await createManga(data)
  return c.json(manga, 201)
})

api.get('/', async (c) => {
  const list = await getMangaList()
  return c.json(list)
})
```

**Frontend Type-Safe API Client** (with Hono RPC):
```typescript
// apps/web/src/api/client.ts
import { hc } from 'hono/client'
import type { ApiType } from '@manga/api'

const client = hc<ApiType>('http://localhost:3000')

// Full type inference on requests/responses
const mangaList = await client.api.manga.$get()
```

---

## Technology Stack Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Hono | Lightweight, CRUD-perfect, type-safe |
| **ORM** | Drizzle | Code-first, transparent SQL, monorepo-friendly |
| **Database** | PostgreSQL | Multi-user concurrency, production-ready |
| **Validation** | Zod (shared) | Shared schemas between FE/BE |
| **Monorepo Tool** | pnpm + Turborepo | Fast CI, parallel dev, workspace support |
| **Concurrent Dev** | Turborepo `dev` task | Single command, both servers + HMR |

---

## Implementation Checklist

- [ ] Create `apps/api/` folder structure
- [ ] Initialize Hono project in `apps/api/`
- [ ] Set up `packages/shared/` for validators + types
- [ ] Install Drizzle + PostgreSQL driver (`drizzle-orm`, `pg`)
- [ ] Define schema in `apps/api/src/db/schema.ts`
- [ ] Create Docker Compose for PostgreSQL (dev environment)
- [ ] Build CRUD routes for manga, chapters
- [ ] Implement JWT auth middleware (if needed for admin operations)
- [ ] Update root `pnpm-workspace.yaml` to include `apps/api`
- [ ] Configure root `package.json` dev scripts for concurrent servers
- [ ] Test both servers running together with HMR working

---

## Notes & Assumptions

- **Image Storage**: API stores image metadata (URLs, sizes) in PostgreSQL; actual images hosted on external CDN/S3
- **Auth**: Assumed simple JWT for admin operations; user reads are unauthenticated
- **Local Dev**: PostgreSQL runs in Docker via Compose (no manual setup)
- **Deployment**: Hono supports Node.js, Deno, Bun, and serverless (AWS Lambda, Cloudflare Workers)

---

## Sources

- [Hono vs Fastify vs Express Performance Benchmarks](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/)
- [Drizzle vs Prisma ORM Comparison](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)
- [PostgreSQL vs SQLite Production APIs](https://betterstack.com/community/guides/databases/postgresql-vs-sqlite/)
- [pnpm Monorepo Setup Guide](https://blog.logrocket.com/managing-full-stack-monorepo-pnpm/)
- [Turborepo + pnpm Concurrent Development](https://turborepo.dev/docs)
- [Hono CRUD API Examples](https://hono.dev/docs/)

## Unresolved Questions

1. **Caching Layer**: Need Redis for manga lists/search results? (Defer until performance profiling)
2. **Admin Panel**: Separate dashboard app or API routes with admin auth?
3. **CDN Integration**: Which image CDN for manga page serving? (Separate architecture decision)
