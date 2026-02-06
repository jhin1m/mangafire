---
title: "pnpm Monorepo Setup for MangaFire"
description: "Convert single React app to pnpm monorepo with Hono API backend and shared types package"
status: completed
priority: P2
effort: 6h
branch: main
tags: [monorepo, pnpm, hono, drizzle, infrastructure]
created: 2026-02-06
reviewed: 2026-02-06
---

# pnpm Monorepo Setup

Convert MangaFire from single React+Vite app to pnpm monorepo: `apps/web`, `apps/api` (Hono), `packages/shared` (Zod + types).

## Dependency Graph

```
Phase 01 (Root Workspace)
    |
    +---> Phase 02 (Move FE to apps/web)  --|
    |                                       |
    +---> Phase 03 (packages/shared)     ---+--> Phase 05 (Integration)
    |                                       |
    +---> Phase 04 (apps/api scaffold)   --|
```

**Phase 01**: Sequential (first) | **Phases 02, 03, 04**: Parallel | **Phase 05**: Sequential (last)

## Phase Files

| Phase | File | Effort | Owns |
|-------|------|--------|------|
| 01 - Root Workspace | [phase-01.md](phases/phase-01.md) | 1h | Root configs: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore` |
| 02 - Move Frontend | [phase-02.md](phases/phase-02.md) | 1.5h | `apps/web/` directory, FE-specific configs |
| 03 - Shared Package | [phase-03.md](phases/phase-03.md) | 1h | `packages/shared/` directory |
| 04 - API Scaffold | [phase-04.md](phases/phase-04.md) | 1.5h | `apps/api/` directory, `docker-compose.yml` |
| 05 - Integration | [phase-05.md](phases/phase-05.md) | 1h | Cross-package wiring, verification |

## Research References

- [pnpm Monorepo Best Practices](research/researcher-01-pnpm-monorepo-best-practices.md)
- [Backend Stack Selection](research/researcher-02-backend-stack-selection.md)

## Key Decisions

- **No Turborepo** initially; pnpm workspaces + filter scripts sufficient for 1-3 devs
- **Hono** over Express/Fastify: lightweight, type-safe RPC, edge-compatible
- **Drizzle** over Prisma: code-first, no generation step, transparent SQL
- **PostgreSQL** via Docker Compose for dev environment
- **Zod** validators shared between FE/BE in `packages/shared`
- FE `build.outDir` stays local (`dist/`) not root-relative; simplifies deployment
- Root `.eslintrc.cjs` stays at root; app configs extend it

## Validation Summary

**Validated:** 2026-02-06
**Questions asked:** 4

### Confirmed Decisions
- **Backend Framework**: Hono (confirmed)
- **Database**: PostgreSQL + Docker Compose (confirmed, user has Docker)
- **Shared Package**: Types + Zod validators from day 1 (confirmed)
- **Next after monorepo**: Build API routes (manga CRUD)

### Action Items
- [ ] Fix ESLint plugin dependencies in root package.json (BLOCKER)
- [ ] Complete Phase 05 verification steps (dev servers, lint)
- [ ] After monorepo setup, plan manga CRUD API routes as next task

## Unresolved Questions

1. Redis caching layer needed? (Defer until performance profiling)
2. Admin panel: separate app or API routes with auth middleware?
3. Image CDN strategy for manga page serving?
