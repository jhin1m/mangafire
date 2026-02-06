# Phase 01: Database & Shared Types

## Context

- **Plan**: [plan.md](./plan.md)
- **Depends on**: Nothing (independent)
- **Blocks**: Phase 02, Phase 03
- **Parallelization**: This phase must complete first. ~1h effort.

## Overview

Add `users` and `refresh_tokens` tables to the existing Drizzle schema, plus shared auth types and Zod validators consumed by both frontend and backend.

## Key Insights

- Existing schema uses `serial` PKs, `text` fields, `timestamp` with `defaultNow()` -- follow same patterns
- Existing enums use `pgEnum` -- but decision says role is plain text field, not enum (simpler, fewer migrations)
- Shared package uses source exports (no build step), barrel re-exports via index files
- `@mangafire/shared/types` and `@mangafire/shared/validators` already have export paths in package.json

## Requirements

1. `users` table: id (serial PK), email (unique), password_hash, username, avatar, role (text default 'user'), created_at, updated_at, deleted_at (soft delete)
2. `refresh_tokens` table: id (serial PK), user_id (FK to users), token_hash (SHA-256), expires_at, created_at
3. Shared types: `User`, `AuthUser`, `AuthResponse`, `LoginDto`, `RegisterDto`, `TokenPayload`
4. Shared validators: `loginSchema`, `registerSchema`, `updateProfileSchema`

## Architecture

### DB Tables

```
users
├── id: serial PK
├── email: text NOT NULL UNIQUE
├── password_hash: text NOT NULL
├── username: text NOT NULL
├── avatar: text (nullable)
├── role: text NOT NULL DEFAULT 'user'
├── created_at: timestamp DEFAULT now()
├── updated_at: timestamp DEFAULT now()
└── deleted_at: timestamp (nullable, soft delete)

refresh_tokens
├── id: serial PK
├── user_id: integer FK → users.id CASCADE
├── token_hash: text NOT NULL
├── expires_at: timestamp NOT NULL
└── created_at: timestamp DEFAULT now()
```

### Shared Types (TypeScript)

```typescript
// User (public-safe, no password_hash)
type AuthUser = { id: number; email: string; username: string; avatar: string | null; role: string }

// DTOs
type LoginDto = { email: string; password: string }
type RegisterDto = { email: string; username: string; password: string; confirmPassword: string }
type UpdateProfileDto = { username?: string; avatar?: string }

// Response
type AuthResponse = { user: AuthUser; accessToken: string }
type TokenPayload = { sub: number; email: string; role: string }
```

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/db/schema.ts` | MODIFY | Add `users` table, `refresh_tokens` table, relations |
| `packages/shared/src/types/auth.ts` | CREATE | Auth types: AuthUser, LoginDto, RegisterDto, etc. |
| `packages/shared/src/types/index.ts` | MODIFY | Add `export * from './auth'` |
| `packages/shared/src/validators/auth.ts` | CREATE | Zod schemas: loginSchema, registerSchema, updateProfileSchema |
| `packages/shared/src/validators/index.ts` | MODIFY | Add `export * from './auth'` |

## File Ownership

Only this phase touches the files listed above. No other phase may modify them.

## Implementation Steps

### Step 1: Add DB tables to schema.ts (MODIFY existing file)

Append after `mangaGenreRelations` in `apps/api/src/db/schema.ts`:

```typescript
// Users table
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    username: text('username').notNull(),
    avatar: text('avatar'),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
)

// Refresh tokens table
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  })
)

// User relations
export const userRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}))

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))
```

### Step 2: Create shared auth types

Create `packages/shared/src/types/auth.ts`:

```typescript
export type AuthUser = {
  id: number
  email: string
  username: string
  avatar: string | null
  role: string
}

export type LoginDto = {
  email: string
  password: string
}

export type RegisterDto = {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export type UpdateProfileDto = {
  username?: string
  avatar?: string
}

export type AuthResponse = {
  user: AuthUser
  accessToken: string
}

export type TokenPayload = {
  sub: number
  email: string
  role: string
}
```

Add `export * from './auth'` to `packages/shared/src/types/index.ts`.

### Step 3: Create shared auth validators

Create `packages/shared/src/validators/auth.ts`:

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  avatar: z.string().url().optional(),
})
```

Add `export * from './auth'` to `packages/shared/src/validators/index.ts`.

### Step 4: Push DB schema

```bash
cd apps/api && pnpm db:push
```

## Todo List

- [ ] Add `users` + `refresh_tokens` tables to `schema.ts`
- [ ] Add relations for users/refreshTokens
- [ ] Create `packages/shared/src/types/auth.ts`
- [ ] Update `packages/shared/src/types/index.ts` barrel export
- [ ] Create `packages/shared/src/validators/auth.ts`
- [ ] Update `packages/shared/src/validators/index.ts` barrel export
- [ ] Run `pnpm db:push` to apply schema
- [ ] Run `pnpm type-check` to verify

## Success Criteria

- `pnpm db:push` succeeds; `users` and `refresh_tokens` tables exist in DB
- `pnpm type-check` passes across all packages
- `import { AuthUser, loginSchema } from '@mangafire/shared'` resolves in both api and web

## Conflict Prevention

- Only appends to `schema.ts` (after line 109) -- no modifications to existing manga/genre tables
- Only adds new export line to shared index files
- No file overlap with any other phase

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema push fails | Blocks all phases | Test with `db:generate` first to see migration SQL |
| Type conflicts with existing shared types | Low | Auth types use distinct names, no overlap with manga/filter types |

## Security Considerations

- `password_hash` stored in DB, never exposed in `AuthUser` type
- `deleted_at` enables soft delete (accounts can be recovered)
- `refresh_tokens.token_hash` stores SHA-256 hash, not raw token

## Next Steps

After completion, Phase 02 and Phase 03 can begin in parallel.
