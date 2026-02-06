---
title: "Phase 3 - Authentication System"
description: "JWT auth with login/register, protected routes, refresh tokens"
status: pending
priority: P1
effort: 8h
branch: main
tags: [auth, jwt, security, phase-3]
created: 2026-02-06
---

# Phase 3 - Authentication System

## Dependency Graph

```
Phase 01 (DB + Shared Types)  ────────→ ┐
Phase 02 (Backend Auth API)   ←01──────→ ├─→ Phase 04 (Integration)
Phase 03 (Frontend Auth UI)   ←01──────→ ┘
```

Phase 02 + 03 run **in parallel** after Phase 01. Phase 04 requires all three.

## File Ownership Matrix

| Phase | Exclusive Files |
|-------|----------------|
| 01 | `apps/api/src/db/schema.ts` (ADD users+tokens), `packages/shared/src/types/auth.ts`, `packages/shared/src/validators/auth.ts`, shared index files |
| 02 | `apps/api/src/routes/auth.ts`, `apps/api/src/routes/auth-helpers.ts` (rename to `manga-helpers.ts` stays), `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/password.ts`, `apps/api/src/lib/token.ts`, `apps/api/package.json` |
| 03 | `apps/web/src/views/auth/*`, `apps/web/src/services/auth-service.ts`, `apps/web/src/store/slices/auth/sessionSlice.ts`, `apps/web/src/store/slices/auth/userSlice.ts`, `apps/web/src/configs/routes.config/authRoute.tsx`, `apps/web/src/assets/css/auth.css`, `apps/web/src/index.css` |
| 04 | `apps/web/src/components/route/ProtectedRoute.tsx`, `apps/web/src/components/route/PublicRoute.tsx`, `apps/web/src/store/storeSetup.ts`, `apps/web/src/configs/app.config.ts`, `apps/api/src/index.ts`, `apps/api/.env.example` |

## Design Decisions (Locked)

- Argon2id for hashing; access token in Redux memory; refresh in httpOnly cookie
- Serial PKs (match existing schema); `hono/jwt` built-in; plain fetch (no axios)
- Manual form validation; role as text field (`user`|`admin`); no email verify/password reset yet

## Effort Breakdown

| Phase | Effort | Parallelizable |
|-------|--------|---------------|
| 01 - DB + Shared Types | 1h | Independent |
| 02 - Backend Auth API | 3h | After 01, parallel with 03 |
| 03 - Frontend Auth UI | 2.5h | After 01, parallel with 02 |
| 04 - Integration | 1.5h | After 01+02+03 |
| **Total** | **8h** | |

## Phase Files

- [Phase 01: Database & Shared Types](./phase-01-database-shared-types.md)
- [Phase 02: Backend Auth API](./phase-02-backend-auth-api.md)
- [Phase 03: Frontend Auth UI & State](./phase-03-frontend-auth-ui-state.md)
- [Phase 04: Integration & Guards](./phase-04-integration-guards.md)

## Validation Summary

**Validated:** 2026-02-06
**Questions asked:** 7

### Confirmed Decisions
- **Logout scope**: Logout everywhere (delete all user refresh tokens) — simpler & more secure
- **Auth guard approach**: Option B — route-level middleware in index.ts, preserves file ownership
- **Silent refresh**: Only on protected routes for Phase 3 — add global auth init later
- **Username field**: Yes, keep username field — needed for display name on comments/profile
- **Rate limiting**: 5 requests/15 minutes on login/register — good balance for MVP
- **Password hashing**: Argon2id confirmed — fallback to @node-rs/argon2 if native build fails
- **Route access**: **Browsing routes → PUBLIC** — users can browse manga without login

### Action Items (Plan Revisions Needed)
- [ ] **Phase 04**: Move browsing routes (`/home`, `/filter`, `/manga/:slug`, `/genre/:slug`, etc.) from `appsRoute.tsx` (protected) to public access. Options: (a) render them outside ProtectedRoute, or (b) make ProtectedRoute pass-through for non-admin routes. This requires `appsRoute.tsx` changes — add to Phase 04 file ownership.
- [ ] **Phase 04**: Add `apps/web/src/configs/routes.config/appsRoute.tsx` to Phase 04 file ownership, OR create a new routing structure with public vs admin routes
- [ ] **Phase 04**: ProtectedRoute should only guard admin/write routes, not browsing routes
