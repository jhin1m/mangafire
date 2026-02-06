# Backend JWT Authentication Research Report

## 1. Hono JWT Middleware

### Core Features
- Built-in `hono/jwt` middleware verifies JWT tokens via Authorization header or cookie
- Default algorithm: HS256; supports HS256/384/512, RS256/384/512, PS256/384/512, ES256/384/512, EdDSA
- Secret should be stored in env vars: `c.env.JWT_SECRET`

### Usage Pattern
```typescript
import { jwt } from 'hono/jwt'

app.use('/api/protected/*', jwt({ secret: c.env.JWT_SECRET }))

// Sign token
import { sign } from 'hono/jwt'
const token = await sign({ userId: 123, exp: Math.floor(Date.now() / 1000) + 60 * 15 }, secret)

// Verify token
import { verify } from 'hono/jwt'
const payload = await verify(token, secret)
```

### Best Practices
- Set `exp` claim for token expiration (15 min recommended)
- Use `iss` claim for issuer validation
- Support `nbf` (not before) for future-dated tokens
- Cookie option available: set `cookie: 'token'` to read from cookies
- Custom error handling: `JwtTokenExpired`, `JwtTokenInvalid`, `JwtTokenNotBefore`

**Sources**: [JWT Auth Middleware - Hono](https://hono.dev/docs/middleware/builtin/jwt), [JWT Authentication Helper - Hono](https://hono.dev/docs/helpers/jwt)

---

## 2. Password Hashing: bcrypt vs Argon2

### Recommendation: **Argon2id** (2026 standard)

| Algorithm | Hash Time | Memory | Security |
|-----------|-----------|--------|----------|
| bcrypt (work_factor=12) | ~250ms | ~4KB | Vulnerable to GPU attacks |
| Argon2id (m=65536, t=3, p=4) | ~150ms | ~64MB | Resistant to GPU/ASIC attacks |

### Why Argon2id?
- Winner of Password Hashing Competition (2015)
- Memory-hard: resists GPU/ASIC brute-force
- Configurable memory cost, time cost, parallelism
- Better performance (150ms vs 250ms for bcrypt)

### Implementation
```typescript
import argon2 from 'argon2'

// Hash password
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4
})

// Verify password
const isValid = await argon2.verify(hash, password)
```

**Library**: `argon2` (npm) - native bindings, mature, widely used

**Sources**: [Password Hashing Guide 2025: Argon2 vs Bcrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/), [Argon2 vs Bcrypt: The Modern Standard](https://medium.com/@lastgigin0/argon2-vs-bcrypt-the-modern-standard-for-secure-passwords-6d19911485c5)

---

## 3. User Table Schema (Drizzle ORM)

### Recommended Schema
```typescript
import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at') // soft delete
}, (table) => ({
  emailIdx: uniqueIndex('email_idx').on(table.email)
}))
```

### Best Practices
- Use `uuid` for primary key (better than serial for distributed systems)
- Use `identity()` columns instead of `serial` (PostgreSQL recommendation)
- Separate reusable columns (timestamps) into shared file
- Enable Row-Level Security (RLS) for multi-tenant apps
- Add `deletedAt` for soft delete pattern
- Index email for fast lookup

**Sources**: [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), [Drizzle ORM Adapter | Better Auth](https://www.better-auth.com/docs/adapters/drizzle)

---

## 4. Token Strategy

### Access + Refresh Token Pattern

**Access Token**:
- Short-lived (15 min)
- Stored in memory (React state) or sessionStorage
- Used for API requests

**Refresh Token**:
- Long-lived (7 days)
- Stored in **httpOnly cookie** (most secure) or **database**
- Used to obtain new access tokens

### Refresh Token Storage: **Database (hashed)**

```typescript
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 hash
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at') // for manual revocation
})
```

### Security Best Practices
- **Store SHA-256 hash, not raw token** - prevents token theft from DB leak
- **Rotation**: issue new refresh token on each access token refresh, revoke old
- **Reuse detection**: if revoked token used, revoke all user tokens (indicates theft)
- **httpOnly cookie**: `httpOnly: true`, `secure: true` (prod), `sameSite: 'strict'`

**Sources**: [What Are Refresh Tokens and How to Use Them Securely](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/), [How to Build a Secure Authentication System with JWT and Refresh Tokens](https://www.freecodecamp.org/news/how-to-build-a-secure-authentication-system-with-jwt-and-refresh-tokens/)

---

## 5. Security Best Practices

### Rate Limiting for Auth Endpoints

**Hono Rate Limiter**: `hono-rate-limiter` package

```typescript
import { rateLimiter } from 'hono-rate-limiter'

// Strict rate limit for auth endpoints
const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per window
  standardHeaders: 'draft-7',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown'
})

app.post('/api/auth/login', authLimiter, loginHandler)
app.post('/api/auth/register', authLimiter, registerHandler)
```

### OWASP Auth Guidelines (API2:2023)
- **Prevent credential stuffing**: strict rate limits on login
- **Account lockout**: after N failed attempts, lock account temporarily
- **CAPTCHA**: add after 3 failed attempts
- **Brute force protection**: exponential backoff for failed attempts
- **Session management**: invalidate tokens on logout, password change
- **Secure password reset**: use time-limited tokens, don't leak user existence

**Sources**: [API2:2023 Broken Authentication - OWASP](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/), [Rate Limiting Hono Apps: An Introduction](https://dev.to/fiberplane/an-introduction-to-rate-limiting-3j0)

---

## Implementation Checklist

- [ ] Install: `argon2`, `hono-rate-limiter`
- [ ] Create `users` + `refresh_tokens` tables in Drizzle schema
- [ ] Implement auth routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- [ ] Add JWT middleware to protected routes
- [ ] Implement rate limiting on auth endpoints
- [ ] Store refresh tokens as SHA-256 hash in DB
- [ ] Add token rotation + reuse detection
- [ ] Set httpOnly cookies for refresh tokens
- [ ] Add password validation (min length, complexity)
- [ ] Implement account lockout after failed attempts

---

## Unresolved Questions

1. Should we implement account email verification on registration?
2. Do we need password reset flow in Phase 3 or defer to later?
3. Should admin role management be part of this phase or separate feature?
4. Do we need multi-device session management (revoke all sessions)?
