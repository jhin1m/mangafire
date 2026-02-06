# Hono + Drizzle CRUD API Research Report

**Date**: 2026-02-06
**Stack**: Hono 4.x, Drizzle ORM 0.29.x, postgres-js, Zod
**Context**: Monorepo API (apps/api), shared validators (packages/shared)

---

## 1. Hono Route Organization

**Best Practices**:
- Separate files by resource: `authors.ts`, `books.ts`, etc.
- Use `app.route()` to combine resource modules into main app
- Define GET (list/byID), POST (create), PUT/PATCH (update), DELETE per resource file
- Avoid controller classes; use functional handlers

**Factory Helper** (type-safety):
```ts
import { createFactory } from 'hono/factory'
const factory = createFactory()
const middleware = factory.createMiddleware(async (c, next) => { ... })
const handlers = factory.createHandlers((c) => { ... })
```

**AppVariables Typing**:
```ts
type AppVariables = { user: User }
const app = new Hono<{ Variables: AppVariables }>()
```

**Middleware Order**:
- Executes in registration order
- Code before `await next()` runs first
- Code after `await next()` runs last

---

## 2. Drizzle ORM CRUD Patterns

**Setup** (postgres-js):
```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })
```

**Operations**:

**INSERT**:
```ts
await db.insert(manga).values({ title: '...', ... }).returning()
```

**SELECT**:
```ts
const results = await db.select().from(manga).where(eq(manga.id, id))
const single = await db.query.manga.findFirst({ where: eq(manga.id, id) })
```

**UPDATE**:
```ts
await db.update(manga).set({ title: '...' }).where(eq(manga.id, id)).returning()
// undefined values ignored, null sets column to NULL
```

**DELETE**:
```ts
await db.delete(manga).where(eq(manga.id, id)).returning()
```

**Key Features**:
- Type-safe query builder extracts TS types from schema
- `.returning()` returns affected rows
- Composable functions avoid raw SQL strings

---

## 3. Hono + Zod Validation

**@hono/zod-validator** Integration:
```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({ title: z.string(), author: z.string() })

app.post('/manga', zValidator('json', schema), async (c) => {
  const data = c.req.valid('json') // typed!
  return c.json({ ... })
})
```

**Validation Targets**: `json`, `query`, `header`, `param`, `cookie`, `form`

**Default Behavior**: Uses `.safeParseAsync()`

**Custom Parsing**:
```ts
zValidator('json', schema, (result, c) => {
  if (!result.success) {
    throw new HTTPException(400, { message: 'Validation failed' })
  }
})
```

**Advanced Pattern** (consistent error handling):
```ts
const validate = (target, schema) => zValidator(target, schema, (result, c) => {
  if (!result.success) throw new HTTPException(400, { message: result.error.format() })
})
```

**OpenAPI**: Use `@hono/zod-openapi` for auto-generated Swagger docs

---

## 4. Pagination Patterns

### Offset-Based (simple, jump to page N)
```ts
const page = Number(c.req.query('page') || 1)
const limit = Number(c.req.query('limit') || 20)
const offset = (page - 1) * limit

const items = await db.select().from(manga).limit(limit).offset(offset)
const total = await db.select({ count: count() }).from(manga)

return c.json({ items, page, limit, total: total[0].count })
```

**Pros**: Easy implementation, direct page access
**Cons**: Performance degrades with high offsets, skips/duplicates on concurrent writes

### Cursor-Based (efficient, stable)
```ts
const cursor = c.req.query('cursor') // last seen ID
const limit = 20

const items = await db.select().from(manga)
  .where(cursor ? gt(manga.id, cursor) : undefined)
  .orderBy(manga.id)
  .limit(limit)

const nextCursor = items.length === limit ? items[items.length - 1].id : null

return c.json({ items, nextCursor })
```

**Pros**: Consistent results, no skipped rows, efficient (PG auto-indexes PKs)
**Cons**: Can't jump to page N, more complex

**Libraries**:
- `drizzle-pagination` (cursor pagination helper)
- `drizzle-cursor` (cursor utils)

**Recommendation**: Offset for admin UIs, cursor for infinite scroll APIs

---

## 5. Error Handling

**HTTPException**:
```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(404, { message: 'Manga not found' })
throw new HTTPException(401, { message: 'Unauthorized', cause: { userId } })
```

**Centralized Error Handler**:
```ts
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }

  if (err.name === 'ZodError') {
    return c.json({ error: 'Validation failed', issues: err.issues }, 400)
  }

  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})
```

**Best Practices**:
- Throw HTTPException for known errors (404, 401, 400, etc.)
- Use `onError` for global error handling
- Differentiate error types (HTTPException, ZodError, DB errors)
- Hide stack traces in production
- Use `cause` option for debugging metadata

---

## Common Pitfalls

1. **Validation**: Forgetting to use `c.req.valid()` after zValidator (loses type safety)
2. **Drizzle**: Using `undefined` in `.set()` (ignored) vs `null` (sets NULL)
3. **Pagination**: High offsets degrade performance; switch to cursor for large datasets
4. **Error Handling**: Not handling `ZodError` separately in `onError`
5. **Middleware Order**: Registering auth middleware after route handlers (won't execute)

---

## Recommendations

**For MangaFire API**:
1. Organize routes: `apps/api/src/routes/manga.ts`, `chapters.ts`, `genres.ts`
2. Use Factory Helper for typed middleware (auth, rate-limit)
3. Wrap zValidator for consistent validation errors
4. Implement offset pagination for manga listing (admin), cursor for chapter feeds
5. Use centralized `onError` handler for HTTPException + ZodError
6. Define shared Zod schemas in `packages/shared/src/validators/`
7. Return deleted/updated rows with `.returning()` for audit logging

**Route Structure Example**:
```
apps/api/src/
├── routes/
│   ├── manga.ts      # CRUD for manga
│   ├── chapters.ts   # CRUD for chapters
│   └── genres.ts     # CRUD for genres
├── middleware/
│   └── auth.ts       # JWT validation
├── db/
│   ├── schema.ts     # Drizzle schema
│   └── index.ts      # DB client
└── index.ts          # app.route() aggregator
```

---

## Sources

- [Hono Best Practices](https://hono.dev/docs/guides/best-practices)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [Hono Factory Helper](https://hono.dev/docs/helpers/factory)
- [Drizzle PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Insert Docs](https://orm.drizzle.team/docs/insert)
- [Drizzle Update Docs](https://orm.drizzle.team/docs/update)
- [Hono Validation Guide](https://hono.dev/docs/guides/validation)
- [@hono/zod-validator npm](https://www.npmjs.com/package/@hono/zod-validator)
- [Drizzle Cursor Pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination)
- [Drizzle Offset Pagination](https://orm.drizzle.team/docs/guides/limit-offset-pagination)
- [Hono HTTPException Docs](https://hono.dev/docs/api/exception)
- [Hono Error Handling Examples](https://hono.dev/examples/validator-error-handling)
