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

// CORS — credentials: true required for httpOnly cookie auth
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

// Manga: GET is public, write ops (POST/PATCH/DELETE) require auth
app.use('/api/manga/*', async (c, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.use('/api/manga', async (c, next) => {
  if (['POST'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.route('/api/manga', mangaRoutes)

// Start server
const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
