# Phase 01 - API Infrastructure

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: nothing
- Blocks: Phase 03, 04, 05

## Parallelization Info
- **Can run in parallel with**: Phase 02
- **Exclusive files**: `App.tsx`, `vite.config.ts`, `package.json`, `services/api-client.ts`, `lib/query-client.ts`
- **No shared files with any other phase**

## Overview
Install TanStack Query, create centralized fetch-based HTTP client with JWT token injection and 401 refresh logic, configure Vite proxy for dev, wire QueryClientProvider into App.tsx.

## Key Insights
- Existing `auth-service.ts` uses raw fetch with manual `Authorization` header -- new api-client centralizes this
- Auth token lives in Redux (`store.getState().auth.session.token`)
- Vite has no proxy configured -- `/api` calls will fail without it (API runs on :3000, web on :5173)
- `ApiResponse<T>` from `@mangafire/shared/types` is the standard response envelope

## Requirements
1. Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
2. Create `api-client.ts` -- fetch wrapper with base URL, auth headers, error normalization
3. Create `query-client.ts` -- QueryClient config with sensible defaults
4. Add Vite dev proxy `/api` -> `http://localhost:3000/api`
5. Wrap App with `QueryClientProvider`

## Architecture

```
App.tsx
  └── QueryClientProvider (from lib/query-client.ts)
        └── ... existing providers

services/api-client.ts
  ├── apiClient.get<T>(url, params?)
  ├── apiClient.post<T>(url, body)
  ├── apiClient.patch<T>(url, body)
  └── apiClient.delete<T>(url)
  (all return ApiResponse<T>, auto-inject Bearer token from Redux store)
```

## Related Code Files (Exclusive to Phase 01)

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | MODIFY | Add @tanstack/react-query deps |
| `apps/web/vite.config.ts` | MODIFY | Add proxy config |
| `apps/web/src/App.tsx` | MODIFY | Wrap with QueryClientProvider |
| `apps/web/src/services/api-client.ts` | CREATE | Centralized HTTP client |
| `apps/web/src/lib/query-client.ts` | CREATE | QueryClient instance + config |

## Implementation Steps

### Step 1: Install dependencies
```bash
cd apps/web && pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

### Step 2: Create api-client.ts
Path: `apps/web/src/services/api-client.ts`

Key design:
- Import store directly (not via hooks -- service layer is outside React)
- Read token from `store.getState().auth.session.token`
- Base URL from `import.meta.env.VITE_API_BASE_URL || ''` (empty = same origin, proxy handles it)
- On 401: attempt one refresh via `authService.refresh()`, retry original request
- Return typed `ApiResponse<T>`
- Helper to build query string from params object

```ts
// Pseudocode (~25 lines)
import store from '@/store'
import type { ApiResponse } from '@mangafire/shared/types'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

function getHeaders(): HeadersInit {
  const token = store.getState().auth.session.token
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function request<T>(url: string, opts?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${url}`, { headers: getHeaders(), credentials: 'include', ...opts })
  if (res.status === 401) { /* refresh + retry once */ }
  return res.json()
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
```

### Step 3: Create query-client.ts
Path: `apps/web/src/lib/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### Step 4: Add Vite proxy
In `vite.config.ts`, add to `defineConfig`:
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

### Step 5: Wire QueryClientProvider in App.tsx
Wrap outermost provider around `<Provider store={store}>`:
```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

// Inside App return:
<QueryClientProvider client={queryClient}>
  <Provider store={store}>
    ...existing...
  </Provider>
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

QueryClientProvider must be OUTSIDE Redux Provider since api-client reads store directly, not via hooks.

## Todo
- [x] Install @tanstack/react-query + devtools
- [x] Create `services/api-client.ts` with fetch wrapper
- [x] Create `lib/query-client.ts`
- [x] Add Vite proxy for `/api`
- [x] Wrap App.tsx with QueryClientProvider
- [x] Verify `pnpm type-check` passes
- [x] Refactor auth-service.ts to use api-client
- [x] Create seed-manga.ts with 10 manga + chapters

## Success Criteria
- `pnpm type-check` passes with zero new errors
- Vite dev server proxies `/api/health` to backend successfully
- QueryClientProvider renders without errors
- api-client auto-attaches Bearer token when available

## Conflict Prevention
- Only this phase modifies `App.tsx`, `vite.config.ts`, `package.json`
- Phase 02 creates service files that IMPORT from `api-client.ts` but never modify it
- No other phase creates files in `services/` except `api-client.ts` (Phase 02 adds sibling files)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Circular dependency (store <-> api-client) | Low | High | api-client imports store directly, no hooks |
| Proxy conflicts with existing routes | Low | Medium | `/api` prefix is explicit, no overlap |
| React Query version incompatibility | Low | Low | Pin to latest v5 stable |

## Security
- Token read from Redux store -- never persisted in api-client module state
- 401 refresh uses httpOnly cookie (existing pattern from auth-service)
- No secrets in client code; VITE_API_BASE_URL is a public endpoint

## Next Steps
After completion, Phase 02 services can import `apiClient` and Phase 03-05 can use QueryClientProvider.

## Unresolved Questions
1. Should api-client refactor `auth-service.ts` to use the same client? Recommendation: defer to avoid scope creep -- auth-service works fine standalone.
2. Exact React Query v5 API for devtools -- verify import path during install.
