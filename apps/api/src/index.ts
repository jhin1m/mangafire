import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health'
import { mangaRoutes } from './routes/manga'
import { genreRoutes } from './routes/genres'
import { errorHandler } from './middleware/error-handler'

const app = new Hono()

// Error handler (must be set before routes)
app.onError(errorHandler)

// CORS for frontend dev server
app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
)

// Routes
app.route('/api/health', healthRoutes)
app.route('/api/manga', mangaRoutes)
app.route('/api/genres', genreRoutes)

// Start server
const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
