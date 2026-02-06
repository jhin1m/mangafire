# Project Overview — MangaFire

## Vision

Manga reader web application with browsing, filtering, configurable reading modes, and comprehensive manga library management. A modern platform for exploring and reading manga with flexible layout and navigation options.

## Tech Stack

| Layer | Technologies |
|-------|---|
| **Frontend** | React 18, TypeScript, Vite, Redux Toolkit, react-router-dom |
| **Backend** | Hono (Node.js), Drizzle ORM 0.29.x, PostgreSQL |
| **Shared** | Zod validators, TypeScript types, source exports |
| **DevOps** | Docker Compose (PostgreSQL), pnpm workspaces |
| **Quality** | ESLint, Prettier, Husky, Commitlint |

## Architecture

**Monorepo Structure (pnpm workspaces)**
- `apps/web/` - React SPA with Vite
- `apps/api/` - Hono REST API
- `packages/shared/` - Shared types and validators (no build step)

**Commit Convention**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) enforced via Commitlint + Husky.

## Current State (February 2026)

| Feature | Status |
|---------|--------|
| Monorepo setup | Complete |
| Manga CRUD API | Complete (6 endpoints) |
| Reading view | Complete (modes, directions, fit options) |
| Genre management | Complete |
| Database schema | Complete (3 tables, 3 enums, relations) |
| Authentication | Not implemented |
| File uploads | Not implemented |
| Full-text search | Not implemented |

## MVP Scope

- **Manga Browsing**: List, filter by genre/status/type, pagination (20 items/page)
- **Manga CRUD**: Create, read, update, delete manga with genre associations
- **Reading Configuration**: Long strip vs paged, LTR/RTL directions, fit width/height
- **API**: REST endpoints with Zod validation, error handling, pagination

## Deferred Features

- Authentication/authorization layer (JWT or session-based)
- Chapters/Volumes CRUD (nested under manga)
- File upload system (cover images, chapter pages)
- Full-text search (PostgreSQL tsvector)
- User reading history tracking
- Bookmarks/favorites system

## Success Criteria

- All CRUD endpoints fully functional and tested
- Frontend seamlessly integrates with API
- Reading modes work across all browsers
- Pagination handles large datasets efficiently
- TypeScript strict mode enabled throughout
- ESLint passes without errors
