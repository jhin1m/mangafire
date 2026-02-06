import { Hono, Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { rateLimiter } from 'hono-rate-limiter'
import { db } from '../db/client'
import { users, refreshTokens } from '../db/schema'
import { hashPassword, verifyPassword } from '../lib/password'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from '../lib/token'
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '@mangafire/shared/validators'
import {
  successResponse,
  errorResponse,
  createdResponse,
} from '../lib/api-response'
import { authMiddleware } from '../middleware/auth'
import type { AuthUser, AuthResponse } from '@mangafire/shared/types'

export const authRoutes = new Hono()

const REFRESH_COOKIE_NAME = 'refresh_token'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Rate limiter: 5 requests per 15 minutes
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
})

function setRefreshCookie(c: Context, token: string) {
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
authRoutes.post(
  '/register',
  authRateLimiter,
  zValidator('json', registerSchema),
  async (c) => {
    const { email, username, password } = c.req.valid('json')

    // Check existing user
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))

    if (existing.length > 0) {
      return errorResponse(c, 'Email already registered', 'EMAIL_EXISTS', 409)
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const [newUser] = await db
      .insert(users)
      .values({ email, username, passwordHash })
      .returning()

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })
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
  }
)

// POST /login
authRoutes.post(
  '/login',
  authRateLimiter,
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json')

    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user || user.deletedAt) {
      return errorResponse(
        c,
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401
      )
    }

    const valid = await verifyPassword(user.passwordHash, password)
    if (!valid) {
      return errorResponse(
        c,
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401
      )
    }

    // Delete old refresh tokens for this user first (logout old sessions)
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id))

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
    const refreshToken = generateRefreshToken()

    // Store refresh token hash
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiry(),
    })

    setRefreshCookie(c, refreshToken)

    const response: AuthResponse = { user: toAuthUser(user), accessToken }
    return successResponse(c, response)
  }
)

// POST /logout
authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE_NAME)

  if (token) {
    const tokenHash = hashToken(token)
    // Find the refresh token record
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
    return errorResponse(
      c,
      'Invalid refresh token',
      'INVALID_REFRESH_TOKEN',
      401
    )
  }

  if (storedToken.expiresAt < new Date()) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/api/auth' })
    return errorResponse(
      c,
      'Refresh token expired',
      'REFRESH_TOKEN_EXPIRED',
      401
    )
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, storedToken.userId))

  if (!user || user.deletedAt) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, storedToken.userId))
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

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
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
