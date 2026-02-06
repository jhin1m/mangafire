# Phase 04: Integration & Guards

## Context

- **Plan**: [plan.md](./plan.md)
- **Depends on**: Phase 01, Phase 02, Phase 03 (all must complete)
- **Blocks**: Nothing (final phase)
- **Parallelization**: Cannot be parallelized. ~1.5h effort.

## Overview

Wire everything together: mount auth routes on API, update CORS for cookies, apply auth middleware to manga write endpoints, fix route guards with real Redux state, remove auth from persist whitelist, disable mock mode, and add silent refresh on page load.

## Key Insights

- `ProtectedRoute` currently hardcodes `authenticated = true` -- needs `useAppSelector(state => state.auth.session.signedIn)`
- `PublicRoute` same issue -- authenticated users should NOT see login page
- `storeSetup.ts` persists `['auth', 'theme']` -- must change to `['theme']` only (access token must not survive page reload; refresh cookie handles re-auth)
- `app.config.ts` has `enableMock: true` -- set to `false`
- API `index.ts` needs `app.route('/api/auth', authRoutes)` + CORS `credentials: true`
- Need silent refresh on app mount to restore session from refresh cookie
- `.env.example` needs `JWT_SECRET` variable

## Requirements

1. Mount auth routes in API entry point
2. Update CORS to allow credentials
3. Apply auth middleware to manga POST/PATCH/DELETE
4. Fix ProtectedRoute with real auth state
5. Fix PublicRoute with real auth state
6. Remove `auth` from persist whitelist
7. Set `enableMock: false`
8. Add silent refresh on app bootstrap
9. Add `JWT_SECRET` to `.env.example`

## Architecture

### App Bootstrap Flow (after changes)

```
App mounts
  → PersistGate restores theme only (auth NOT persisted)
  → Layouts mounts
  → Silent refresh attempt:
      authService.refresh() → if success → dispatch signInSuccess + setUser
                             → if fail → user stays logged out (normal)
  → Route resolution:
      Protected route → check state.auth.session.signedIn → redirect if false
      Public route → check signedIn → redirect to home if true
```

### API Route Protection

```
/api/auth/*      → no auth required (public)
/api/manga GET   → no auth required (public read)
/api/manga POST  → authMiddleware required
/api/manga PATCH → authMiddleware required
/api/manga DELETE → authMiddleware required
/api/genres/*    → no auth required (public read)
/api/health      → no auth required
```

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/index.ts` | MODIFY | Mount auth routes, update CORS credentials |
| `apps/api/.env.example` | MODIFY | Add JWT_SECRET |
| `apps/web/src/components/route/ProtectedRoute.tsx` | MODIFY | Use real Redux auth state |
| `apps/web/src/components/route/PublicRoute.tsx` | MODIFY | Use real Redux auth state |
| `apps/web/src/store/storeSetup.ts` | MODIFY | Remove 'auth' from whitelist |
| `apps/web/src/configs/app.config.ts` | MODIFY | Set enableMock to false |

## File Ownership

Only this phase touches the files listed above.

## Implementation Steps

### Step 1: Update API entry (`apps/api/src/index.ts`)

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health'
import { mangaRoutes } from './routes/manga'
import { genreRoutes } from './routes/genres'
import { authRoutes } from './routes/auth'
import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'

const app = new Hono()

// Error handler (must be set before routes)
app.onError(errorHandler)

// CORS for frontend dev server -- credentials: true for cookies
app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
)

// Public routes
app.route('/api/health', healthRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/genres', genreRoutes)

// Manga: GET is public, write ops require auth
app.route('/api/manga', mangaRoutes)

// Start server
const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
```

**For protecting manga write endpoints**, two approaches:

**Option A (preferred)**: Add auth middleware directly in `manga.ts` for POST/PATCH/DELETE. But manga.ts is not owned by this phase.

**Option B**: Apply auth middleware at the router level before the manga route, but only for specific methods. Hono supports per-method middleware:

```typescript
// In index.ts, apply auth to manga write operations
app.use('/api/manga', async (c, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.route('/api/manga', mangaRoutes)
```

Use **Option B** since `manga.ts` is not in this phase's file ownership. The middleware is applied in `index.ts` BEFORE the route mount.

### Step 2: Update .env.example

```
PORT=3000
DATABASE_URL=postgresql://mangafire:mangafire@localhost:5432/mangafire
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change-this-to-a-random-secret-in-production
```

### Step 3: Fix ProtectedRoute

```tsx
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useAppSelector } from '@/store/hook'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)

  const location = useLocation()

  if (!authenticated) {
    return (
      <Navigate
        replace
        to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
```

### Step 4: Fix PublicRoute

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hook'
import appConfig from '@/configs/app.config'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)

  return authenticated ? <Navigate to={authenticatedEntryPath} /> : <Outlet />
}

export default PublicRoute
```

### Step 5: Remove auth from persist whitelist

In `apps/web/src/store/storeSetup.ts`, change:

```typescript
const persistConfig = {
  key: PERSIST_STORE_NAME,
  keyPrefix: '',
  storage,
  whitelist: ['theme'], // removed 'auth' -- token lives in memory only
}
```

### Step 6: Disable mock mode

In `apps/web/src/configs/app.config.ts`:

```typescript
const appConfig: AppConfig = {
  apiPrefix: '/api',
  authenticatedEntryPath: '/',
  unAuthenticatedEntryPath: '/sign-in',
  locale: 'en',
  enableMock: false,
}
```

### Step 7: Add silent refresh on app bootstrap

This is the most critical integration piece. On page load (after redux store initializes), attempt a silent refresh to restore session from the httpOnly cookie.

**Approach**: Add a `useEffect` in the `Layouts` component or create a dedicated `AuthProvider` wrapper. Since `Layouts` is not in our exclusive files, create an `AuthInit` component used in `App.tsx`.

**Wait** -- `App.tsx` is not in our exclusive file list either. Let's re-evaluate.

**Alternative**: The silent refresh can be triggered from `ProtectedRoute` itself. When `authenticated` is false, before redirecting, attempt a refresh. If it succeeds, stay on the page. If it fails, redirect.

Better approach for this phase: Add the silent refresh logic **inside ProtectedRoute** (which IS in our file ownership):

```tsx
import { useEffect, useState } from 'react'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useAppSelector, useAppDispatch } from '@/store/hook'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth-service'
import { signInSuccess, setUser } from '@/store/slices/auth'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)
  const [checking, setChecking] = useState(!authenticated)
  const dispatch = useAppDispatch()
  const location = useLocation()

  useEffect(() => {
    if (authenticated) return

    authService.refresh().then((res) => {
      if (res.success && res.data) {
        dispatch(signInSuccess(res.data.accessToken))
        dispatch(setUser({
          userName: res.data.user.username,
          email: res.data.user.email,
          avatar: res.data.user.avatar || '',
          authority: [res.data.user.role],
        }))
      }
      setChecking(false)
    }).catch(() => {
      setChecking(false)
    })
  }, [authenticated, dispatch])

  if (checking) {
    return null // or a loading spinner
  }

  if (!authenticated) {
    return (
      <Navigate
        replace
        to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
```

**Important**: This means on first load of any protected route, there's a brief check. For public pages that don't go through ProtectedRoute, the user appears logged out until they navigate to a protected route. This is acceptable for Phase 3 -- a global auth init can be added later.

## Todo List

- [ ] Mount auth routes in `apps/api/src/index.ts`
- [ ] Add `credentials: true` to CORS config
- [ ] Add auth middleware for manga write operations (POST/PATCH/DELETE)
- [ ] Add `JWT_SECRET` to `.env.example`
- [ ] Update `ProtectedRoute.tsx` with real auth + silent refresh
- [ ] Update `PublicRoute.tsx` with real auth state
- [ ] Remove `'auth'` from persist whitelist in `storeSetup.ts`
- [ ] Set `enableMock: false` in `app.config.ts`
- [ ] Test full flow: register → login → access protected route → refresh page → silent refresh
- [ ] Test: unauthenticated user redirected to /sign-in
- [ ] Test: authenticated user redirected away from /sign-in
- [ ] Test: manga POST/PATCH/DELETE require auth header
- [ ] Run `pnpm type-check` across all packages
- [ ] Run `pnpm lint`

## Success Criteria

- Full auth flow works end-to-end: register, login, access protected content, logout
- Page refresh restores session via silent refresh (httpOnly cookie)
- Unauthenticated users redirected to `/sign-in` on protected routes
- Authenticated users redirected away from `/sign-in` and `/sign-up`
- Manga GET endpoints remain public
- Manga POST/PATCH/DELETE return 401 without valid token
- Auth token NOT in localStorage (only theme persisted)
- `pnpm type-check` and `pnpm lint` pass

## Conflict Prevention

- All files modified in this phase are exclusively owned -- no overlap
- Uses `app.use('/api/manga', ...)` middleware pattern to protect manga writes WITHOUT modifying `manga.ts`
- No structural changes to `App.tsx`, `rootReducer.ts`, or layout components

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Silent refresh race condition on parallel protected routes | Medium | `checking` state prevents redirect until check completes |
| CORS credentials + cookie not working in dev | High | Verify `sameSite: 'lax'` + `credentials: true` + same localhost origin |
| Removing auth persist breaks existing dev localStorage | Low | Clear localStorage once; theme data preserved |
| Middleware order in index.ts matters | Medium | Place `app.use('/api/manga', ...)` BEFORE `app.route('/api/manga', ...)` |

## Security Considerations

- Access token never persisted to localStorage/sessionStorage
- Silent refresh uses httpOnly cookie (not accessible to JS)
- CORS `credentials: true` required for cookie-based auth
- JWT_SECRET must be changed in production (env example documents this)
- Auth middleware applied at router level prevents bypass
- PublicRoute prevents authenticated session from accessing login (prevents session fixation attempts)

## Next Steps

Phase 3 (Authentication) is complete after this phase. Future enhancements:
- Email verification (Phase 4+)
- Password reset flow (Phase 4+)
- Global auth init component (for restoring session on any page, not just protected routes)
- Admin dashboard with role-based access
- Token refresh interceptor for automatic retry on 401
