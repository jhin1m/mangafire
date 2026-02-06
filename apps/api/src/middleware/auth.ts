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
    throw new HTTPException(401, {
      message: 'Missing or invalid authorization header',
    })
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
