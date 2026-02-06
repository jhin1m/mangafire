// Public-safe user type (never includes password_hash)
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

// Response returned after login/register/refresh
export type AuthResponse = {
  user: AuthUser
  accessToken: string
}

// JWT payload structure
export type TokenPayload = {
  sub: number
  email: string
  role: string
}
