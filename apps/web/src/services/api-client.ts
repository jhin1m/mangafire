import type { ApiResponse } from '@mangafire/shared/types'
import store from '@/store'
import { authService } from './auth-service'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function getHeaders(): HeadersInit {
  const token = store.getState().auth.session.token
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return ''
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  let retryAttempted = false

  const makeRequest = async (): Promise<ApiResponse<T>> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: getHeaders(),
      credentials: 'include',
      ...options,
    })

    // Handle 401 Unauthorized: attempt token refresh once
    if (res.status === 401 && !retryAttempted) {
      retryAttempted = true
      const refreshResult = await authService.refresh()

      if (refreshResult.success && refreshResult.data?.accessToken) {
        // Refresh succeeded, retry original request with new token
        return makeRequest()
      }
    }

    return res.json()
  }

  return makeRequest()
}

export const apiClient = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const queryString = buildQueryString(params)
    return request<T>(`${url}${queryString}`)
  },

  post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  patch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: 'DELETE' })
  },
}
