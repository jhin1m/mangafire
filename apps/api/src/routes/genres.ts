import { Hono } from 'hono'
import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { genres } from '../db/schema'
import { successResponse } from '../lib/api-response'

export const genreRoutes = new Hono()

// GET / - List all genres, ordered by name
genreRoutes.get('/', async (c) => {
  const allGenres = await db.select().from(genres).orderBy(asc(genres.name))

  return successResponse(c, allGenres)
})
