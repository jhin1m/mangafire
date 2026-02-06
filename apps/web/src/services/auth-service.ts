import type { ApiResponse } from '@mangafire/shared/types'
import type { AuthResponse, AuthUser, LoginDto, RegisterDto, UpdateProfileDto } from '@mangafire/shared/types'

const API_BASE = '/api/auth'

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send cookies
    ...options,
  })
  return res.json()
}

export const authService = {
  login(dto: LoginDto) {
    return request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
  },

  register(dto: Omit<RegisterDto, 'confirmPassword'> & { confirmPassword: string }) {
    return request<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
  },

  logout() {
    return request<{ message: string }>('/logout', { method: 'POST' })
  },

  refresh() {
    return request<AuthResponse>('/refresh', { method: 'POST' })
  },

  getProfile(token: string) {
    return request<AuthUser>('/profile', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
  },

  updateProfile(token: string, dto: UpdateProfileDto) {
    return request<AuthUser>('/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    })
  },
}
