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
  const decoded = await verify(token, JWT_SECRET, 'HS256')
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
