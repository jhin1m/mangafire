# Phase 03: API Infrastructure

**Status**: Pending | **Effort**: 1h | **Dependencies**: None | **Parallel**: Yes

## Objective

Build API infrastructure utilities for:
- Centralized error handling (HTTPException, ZodError, DB errors)
- Response helpers (success/error wrappers)
- Pagination utility (offset-based with metadata)

## File Ownership

**Exclusive writes** (no conflicts):
- `apps/api/src/middleware/error-handler.ts` — NEW FILE
- `apps/api/src/lib/api-response.ts` — NEW FILE
- `apps/api/src/lib/pagination.ts` — NEW FILE

**No changes needed**:
- `apps/api/src/middleware/cors.ts` (empty, unused)

## Implementation Steps

### 1. Create Error Handler Middleware (middleware/error-handler.ts)

```typescript
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export async function errorHandler(err: Error, c: Context) {
  console.error('[Error Handler]', err)

  // Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: 'HTTP_EXCEPTION',
        },
      },
      err.status
    )
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.errors,
        },
      },
      400
    )
  }

  // Database errors (postgres-js error codes)
  if (err.message?.includes('unique constraint')) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Resource already exists',
          code: 'DUPLICATE_ENTRY',
          details: err.message,
        },
      },
      409
    )
  }

  if (err.message?.includes('foreign key constraint')) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Referenced resource not found',
          code: 'FOREIGN_KEY_VIOLATION',
          details: err.message,
        },
      },
      400
    )
  }

  // Generic server error
  return c.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    },
    500
  )
}
```

**Key features**:
- HTTPException → HTTP status from exception
- ZodError → 400 with formatted error array
- DB unique constraint → 409 Conflict
- DB FK violation → 400 Bad Request
- Generic error → 500 (hide details in production)

### 2. Create API Response Helpers (lib/api-response.ts)

```typescript
import { Context } from 'hono'
import type { ApiResponse, PaginationMeta } from '@mangafire/shared'

export function successResponse<T>(
  c: Context,
  data: T,
  meta?: PaginationMeta,
  status = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  }
  return c.json(response, status)
}

export function errorResponse(
  c: Context,
  message: string,
  code?: string,
  status = 400
) {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
    },
  }
  return c.json(response, status)
}

export function createdResponse<T>(c: Context, data: T) {
  return successResponse(c, data, undefined, 201)
}

export function noContentResponse(c: Context) {
  return c.body(null, 204)
}
```

**Key features**:
- `successResponse` — 200 OK with data + optional pagination meta
- `errorResponse` — Custom status with error object
- `createdResponse` — 201 Created shorthand
- `noContentResponse` — 204 No Content for deletes

### 3. Create Pagination Utility (lib/pagination.ts)

```typescript
import type { PaginationMeta, PaginationParams } from '@mangafire/shared'

export function calculatePagination(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const page = params.page || 1
  const limit = params.limit || 20
  const pages = Math.ceil(total / limit)

  return {
    total,
    page,
    limit,
    pages,
  }
}

export function getOffsetLimit(params: PaginationParams) {
  const page = params.page || 1
  const limit = params.limit || 20
  const offset = (page - 1) * limit

  return { offset, limit }
}
```

**Key features**:
- `calculatePagination` — Computes meta object from total + params
- `getOffsetLimit` — Converts page/limit to Drizzle offset/limit

**Usage example**:
```typescript
const { offset, limit } = getOffsetLimit({ page: 2, limit: 10 })
// offset = 10, limit = 10

const items = await db.select().from(manga).limit(limit).offset(offset)
const total = await db.select({ count: count() }).from(manga)
const meta = calculatePagination(total[0].count, { page: 2, limit: 10 })
// meta = { total: 50, page: 2, limit: 10, pages: 5 }
```

### 4. Create Directory Structure

```bash
mkdir -p apps/api/src/lib
mkdir -p apps/api/src/middleware
```

### 5. Verify TypeScript Compilation

```bash
cd apps/api
pnpm type-check  # Should pass
```

## Success Criteria

- [ ] `error-handler.ts` handles 5 error types (HTTPException, ZodError, unique constraint, FK violation, generic)
- [ ] `api-response.ts` exports 4 helpers (successResponse, errorResponse, createdResponse, noContentResponse)
- [ ] `pagination.ts` exports 2 utilities (calculatePagination, getOffsetLimit)
- [ ] All files import types from `@mangafire/shared` correctly
- [ ] `pnpm type-check` passes in `apps/api`
- [ ] No runtime dependencies added (Hono + Zod already installed)

## Conflict Prevention

**No overlaps with Phase 01/02/04**:
- Phase 01 only touches `apps/api/src/db/`
- Phase 02 only touches `packages/shared/src/`
- Phase 04 only touches `apps/api/src/routes/` and `apps/api/src/index.ts`

**Safe to run in parallel**: Yes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Error handler not registered in app | Phase 04 will mount it via `app.onError(errorHandler)` |
| DB error message matching too brittle | Use `.includes()` for flexible matching |
| Pagination math overflow | Cap limit at 100 in validator (Phase 02) |
| Response types not matching ApiResponse<T> | Import types from shared package |

## Code Reference

**Import structure**:
```typescript
// error-handler.ts
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

// api-response.ts & pagination.ts
import type { ApiResponse, PaginationMeta, PaginationParams } from '@mangafire/shared'
```

**File structure**:
```
apps/api/src/
├── middleware/
│   └── error-handler.ts
└── lib/
    ├── api-response.ts
    └── pagination.ts
```

## Next Phase

After completion, Phase 04 can import utilities:
```typescript
// In routes/manga.ts
import { successResponse, createdResponse } from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'

// In index.ts
import { errorHandler } from './middleware/error-handler'
app.onError(errorHandler)
```

## Testing Strategy

**Manual validation before Phase 04**:
1. Import utilities in a test file
2. Call `calculatePagination(100, { page: 2, limit: 10 })`
3. Verify output: `{ total: 100, page: 2, limit: 10, pages: 10 }`
4. Call `getOffsetLimit({ page: 3, limit: 20 })`
5. Verify output: `{ offset: 40, limit: 20 }`

**Integration testing in Phase 04**: Error handler will be tested via actual route failures (validation errors, DB errors, etc.)
