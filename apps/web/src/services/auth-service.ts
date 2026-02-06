import type { AuthResponse, AuthUser, LoginDto, RegisterDto, UpdateProfileDto } from '@mangafire/shared/types'
import { apiClient } from './api-client'

export const authService = {
  login(dto: LoginDto) {
    return apiClient.post<AuthResponse>('/api/auth/login', dto)
  },

  register(dto: Omit<RegisterDto, 'confirmPassword'> & { confirmPassword: string }) {
    return apiClient.post<AuthResponse>('/api/auth/register', dto)
  },

  logout() {
    return apiClient.post<{ message: string }>('/api/auth/logout')
  },

  refresh() {
    return apiClient.post<AuthResponse>('/api/auth/refresh')
  },

  getProfile(_token: string) {
    // token now injected automatically by api-client
    return apiClient.get<AuthUser>('/api/auth/profile')
  },

  updateProfile(_token: string, dto: UpdateProfileDto) {
    // token now injected automatically by api-client
    return apiClient.patch<AuthUser>('/api/auth/profile', dto)
  },
}
