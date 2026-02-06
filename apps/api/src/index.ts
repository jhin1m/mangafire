import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health'

const app = new Hono()

// CORS for frontend dev server
app.use(
  '/api/*',
  cors({
    origin: 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
)

// Routes
app.route('/api/health', healthRoutes)

// Start server
const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
