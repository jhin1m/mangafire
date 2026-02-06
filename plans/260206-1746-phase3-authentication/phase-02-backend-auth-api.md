# Phase 02: Backend Auth API

## Context

- **Plan**: [plan.md](./plan.md)
- **Depends on**: Phase 01 (DB schema + shared types must exist)
- **Blocks**: Phase 04
- **Parallelization**: Can run in parallel with Phase 03. ~3h effort.

## Overview

Implement complete backend authentication: password hashing (argon2id), JWT token management (access + refresh), auth routes (register/login/logout/refresh/profile), auth middleware, and rate limiting.

## Key Insights

- Hono has built-in `hono/jwt` for middleware verification + `sign`/`verify` helpers
- API already uses `zValidator`, `ApiResponse` pattern, `errorResponse`/`successResponse` helpers
- CORS already configured for `localhost:5173` with credentials support needed for cookies
- `manga.ts` routes (POST, PATCH, DELETE) need auth protection but actual middleware application happens in Phase 04
- Existing error handler catches `HTTPException` already -- auth middleware can throw `HTTPException(401)`

## Requirements

1. Password utility: hash with argon2id, verify
2. Token utility: sign access JWT (15min), sign refresh JWT (7d), verify, generate refresh token hash
3. Auth routes: POST register, POST login, POST logout, POST refresh, GET profile, PATCH profile
4. Auth middleware: verify JWT from Authorization header, attach user to context
5. Rate limiting on auth endpoints (5 req/15min)
6. Refresh token stored as SHA-256 hash in DB, sent as httpOnly cookie

## Architecture

### Request Flow

```
Client → CORS → Rate Limiter → Auth Route Handler
                                    ├── register: validate → hash password → insert user → generate tokens → set cookie → return
                                    ├── login: validate → find user → verify password → generate tokens → set cookie → return
                                    ├── logout: clear cookie → delete refresh tokens → return
                                    ├── refresh: read cookie → verify → rotate token → set new cookie → return
                                    ├── GET profile: auth middleware → return user
                                    └── PATCH profile: auth middleware → validate → update → return

Auth Middleware: Authorization header → verify JWT → attach { userId, email, role } to c.set('user', ...)
```

### Token Strategy

- **Access token**: JWT, 15min expiry, stored in frontend memory (Redux), sent via `Authorization: Bearer <token>`
- **Refresh token**: Opaque random string (32 bytes hex), 7 days expiry, stored as SHA-256 hash in `refresh_tokens` table, sent as `httpOnly` cookie
- **Rotation**: On refresh, old token deleted, new token issued (reuse detection: if token not found, revoke all user tokens)

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/lib/password.ts` | CREATE | Argon2id hash/verify |
| `apps/api/src/lib/token.ts` | CREATE | JWT sign/verify, refresh token generation, SHA-256 hashing |
| `apps/api/src/middleware/auth.ts` | CREATE | JWT verification middleware, user context setter |
| `apps/api/src/routes/auth.ts` | CREATE | All auth route handlers |
| `apps/api/package.json` | MODIFY | Add `argon2` + `hono-rate-limiter` deps |

## File Ownership

Only this phase touches the files listed above. Phase 04 mounts the auth routes in `index.ts` and applies auth middleware to manga routes.

## Implementation Steps

### Step 1: Add dependencies

```bash
cd apps/api && pnpm add argon2 hono-rate-limiter && pnpm add -D @types/argon2
```

Note: Check if `@types/argon2` exists; argon2 may ship its own types.

### Step 2: Create password utility (`apps/api/src/lib/password.ts`)

```typescript
import argon2 from 'argon2'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
```

### Step 3: Create token utility (`apps/api/src/lib/token.ts`)

```typescript
import { sign, verify } from 'hono/jwt'
import { createHash, randomBytes } from 'crypto'
import type { TokenPayload } from '@mangafire/shared/types'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY_DAYS = 7

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET
  )
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const decoded = await verify(token, JWT_SECRET)
  return decoded as unknown as TokenPayload
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getRefreshTokenExpiry(): Date {
  const date = new Date()
  date.setDate(date.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)
  return date
}

export { JWT_SECRET }
```

### Step 4: Create auth middleware (`apps/api/src/middleware/auth.ts`)

```typescript
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verifyAccessToken } from '../lib/token'
import type { TokenPayload } from '@mangafire/shared/types'

// Extend Hono's context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyAccessToken(token)
    c.set('user', payload)
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
}

// Optional: role-based guard factory
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' })
    }
    await next()
  }
}
```

### Step 5: Create auth routes (`apps/api/src/routes/auth.ts`)

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { db } from '../db/client'
import { users, refreshTokens } from '../db/schema'
import { hashPassword, verifyPassword } from '../lib/password'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from '../lib/token'
import { loginSchema, registerSchema, updateProfileSchema } from '@mangafire/shared/validators'
import { successResponse, errorResponse, createdResponse } from '../lib/api-response'
import { authMiddleware } from '../middleware/auth'
import type { AuthUser, AuthResponse } from '@mangafire/shared/types'

export const authRoutes = new Hono()

const REFRESH_COOKIE_NAME = 'refresh_token'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function setRefreshCookie(c: any, token: string) {
  setCookie(c, REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
  }
}

// POST /register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, username, password } = c.req.valid('json')

  // Check existing user
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing.length > 0) {
    return errorResponse(c, 'Email already registered', 'EMAIL_EXISTS', 409)
  }

  // Create user
  const passwordHash = await hashPassword(password)
  const [newUser] = await db.insert(users).values({ email, username, passwordHash }).returning()

  // Generate tokens
  const accessToken = await signAccessToken({ sub: newUser.id, email: newUser.email, role: newUser.role })
  const refreshToken = generateRefreshToken()

  // Store refresh token hash
  await db.insert(refreshTokens).values({
    userId: newUser.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  })

  setRefreshCookie(c, refreshToken)

  const response: AuthResponse = { user: toAuthUser(newUser), accessToken }
  return createdResponse(c, response)
})

// POST /login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user || user.deletedAt) {
    return errorResponse(c, 'Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    return errorResponse(c, 'Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  // Generate tokens
  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
  const refreshToken = generateRefreshToken()

  // Store refresh token hash (delete old tokens for this user first)
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id))
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  })

  setRefreshCookie(c, refreshToken)

  const response: AuthResponse = { user: toAuthUser(user), accessToken }
  return successResponse(c, response)
})

// POST /logout
authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE_NAME)

  if (token) {
    const tokenHash = hashToken(token)
    // Delete this specific refresh token
    const [found] = await db
      .select({ userId: refreshTokens.userId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))

    if (found) {
      // Delete all refresh tokens for this user (logout everywhere)
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, found.userId))
    }
  }

  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/api/auth' })
  return successResponse(c, { message: 'Logged out successfully' })
})

// POST /refresh
authRoutes.post('/refresh', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE_NAME)

  if (!token) {
    return errorResponse(c, 'No refresh token', 'NO_REFRESH_TOKEN', 401)
  }

  const tokenHash = hashToken(token)
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))

  if (!storedToken) {
    // Possible token reuse -- revoke all tokens for safety
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/api/auth' })
    return errorResponse(c, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401)
  }

  if (storedToken.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/api/auth' })
    return errorResponse(c, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED', 401)
  }

  // Get user
  const [user] = await db.select().from(users).where(eq(users.id, storedToken.userId))
  if (!user || user.deletedAt) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, storedToken.userId))
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/api/auth' })
    return errorResponse(c, 'User not found', 'USER_NOT_FOUND', 401)
  }

  // Rotate: delete old, create new
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
  const newRefreshToken = generateRefreshToken()
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: getRefreshTokenExpiry(),
  })

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
  setRefreshCookie(c, newRefreshToken)

  const response: AuthResponse = { user: toAuthUser(user), accessToken }
  return successResponse(c, response)
})

// GET /profile (protected)
authRoutes.get('/profile', authMiddleware, async (c) => {
  const { sub } = c.get('user')
  const [user] = await db.select().from(users).where(eq(users.id, sub))

  if (!user || user.deletedAt) {
    return errorResponse(c, 'User not found', 'USER_NOT_FOUND', 404)
  }

  return successResponse(c, toAuthUser(user))
})

// PATCH /profile (protected)
authRoutes.patch(
  '/profile',
  authMiddleware,
  zValidator('json', updateProfileSchema),
  async (c) => {
    const { sub } = c.get('user')
    const body = c.req.valid('json')

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, sub))
      .returning()

    if (!updated) {
      return errorResponse(c, 'User not found', 'USER_NOT_FOUND', 404)
    }

    return successResponse(c, toAuthUser(updated))
  }
)
```

### Step 6: Add rate limiting

Apply to the auth routes in `auth.ts` or compose at mount time in Phase 04. For self-contained approach, add at top of auth routes file:

```typescript
import { rateLimiter } from 'hono-rate-limiter'

const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
})

// Apply to login and register only
authRoutes.post('/register', authRateLimiter, zValidator('json', registerSchema), async (c) => { ... })
authRoutes.post('/login', authRateLimiter, zValidator('json', loginSchema), async (c) => { ... })
```

**Note**: If `hono-rate-limiter` API differs, fall back to a simple in-memory rate limiter using a Map with IP + timestamp tracking.

### Step 7: Update package.json

Add to `apps/api/package.json` dependencies:

```json
"argon2": "^0.31.0",
"hono-rate-limiter": "^0.4.0"
```

## Todo List

- [ ] Install argon2 + hono-rate-limiter
- [ ] Create `apps/api/src/lib/password.ts`
- [ ] Create `apps/api/src/lib/token.ts`
- [ ] Create `apps/api/src/middleware/auth.ts`
- [ ] Create `apps/api/src/routes/auth.ts` with all 6 endpoints
- [ ] Add rate limiting to register/login endpoints
- [ ] Test: register new user returns 201 + accessToken + cookie
- [ ] Test: login returns 200 + accessToken + cookie
- [ ] Test: logout clears cookie + tokens
- [ ] Test: refresh rotates token
- [ ] Test: profile GET/PATCH require auth header

## Success Criteria

- All 6 auth endpoints respond correctly
- `pnpm type-check` passes in `apps/api`
- Password hashing uses argon2id (not bcrypt)
- Refresh token stored as SHA-256 hash, never raw
- httpOnly cookie set on login/register/refresh
- Rate limiting active on login/register (5/15min)
- Auth middleware rejects requests without valid Bearer token

## Conflict Prevention

- Creates only NEW files (`password.ts`, `token.ts`, `auth.ts` middleware, `auth.ts` routes)
- Only modifies `package.json` (deps section)
- Does NOT modify `index.ts` (Phase 04 does that)
- Does NOT apply auth middleware to manga routes (Phase 04)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| argon2 native build fails | High | Fallback: use `@node-rs/argon2` (pure Rust via NAPI) or `bcrypt` as last resort |
| hono-rate-limiter API incompatible | Medium | Implement simple in-memory rate limiter (~20 LOC) |
| Cookie not sent cross-origin in dev | Medium | Ensure CORS `credentials: true` + `sameSite: 'lax'` in dev |
| hono/jwt sign API changes | Low | Pin hono version, check import path |

## Security Considerations

- Argon2id with 64MB memory cost resists GPU attacks
- Timing-safe: same error for wrong email vs wrong password ("Invalid email or password")
- Token rotation: old refresh token deleted on each use
- Reuse detection: missing token hash triggers concern (logged, cookie cleared)
- Rate limiting prevents brute force on login/register
- httpOnly cookie prevents XSS token theft
- `secure: true` in production prevents MITM
- `sameSite: 'strict'` in production prevents CSRF
- Password never logged or returned in responses

## Next Steps

After completion, Phase 04 can begin (once Phase 03 also completes).
