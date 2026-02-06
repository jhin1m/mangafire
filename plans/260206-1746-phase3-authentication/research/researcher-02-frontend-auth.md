# Frontend Authentication Research Report

**Date**: 2026-02-06
**Context**: React 18 + Redux Toolkit + react-router-dom v6 + redux-persist

## 1. Token Management

### Storage Options Comparison

| Method | Security | Persistence | XSS Risk | CSRF Risk | Recommendation |
|--------|----------|-------------|----------|-----------|----------------|
| **localStorage** | Low | Yes | High | N/A | ❌ Avoid |
| **Memory (state)** | High | No | Low | N/A | ✅ For access token |
| **httpOnly Cookie** | High | Yes | None | Medium | ✅ For refresh token |

### Recommended: Hybrid Approach (2025 Best Practice)
- **Access token** (short-lived, 5-15min) → Memory (Redux state, NOT persisted)
- **Refresh token** (long-lived, 7-30d) → httpOnly cookie (server-controlled)
- On page refresh: silently request new access token using refresh cookie

### Why NOT localStorage for JWT
- Vulnerable to XSS attacks (malicious scripts can read localStorage)
- Any injected JS can steal tokens
- Cannot set httpOnly/secure flags

### Implementation for MangaFire
```typescript
// apps/web/src/store/slices/auth/authSlice.ts
interface AuthState {
  signedIn: boolean
  token: string | null  // ⚠️ DO NOT persist this
  user: UserInfo | null
}

// In persistConfig (src/store/storeSetup.ts)
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['theme'], // ❌ Remove 'auth' from whitelist
  blacklist: ['auth']   // ✅ Never persist auth tokens
}
```

## 2. API Interceptor Pattern

### Option A: Custom fetchBaseQuery with RTK Query (Recommended 2025)
```typescript
// apps/web/src/store/api/baseQuery.ts
import { fetchBaseQuery } from '@reduxjs/toolkit/query'
import { Mutex } from 'async-mutex'

const mutex = new Mutex()

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  }
})

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  await mutex.waitForUnlock()
  let result = await baseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire()
      try {
        // Refresh token endpoint (sends httpOnly cookie automatically)
        const refreshResult = await baseQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          extraOptions
        )
        if (refreshResult.data) {
          api.dispatch(setToken(refreshResult.data.accessToken))
          result = await baseQuery(args, api, extraOptions)
        } else {
          api.dispatch(logout())
        }
      } finally {
        release()
      }
    } else {
      await mutex.waitForUnlock()
      result = await baseQuery(args, api, extraOptions)
    }
  }
  return result
}
```

### Option B: Axios Interceptors (Alternative)
```typescript
// apps/web/src/utils/axios.ts
import axios from 'axios'
import { store } from '@/store'
import { setToken, logout } from '@/store/slices/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true // Send cookies with requests
})

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const { data } = await axios.post('/auth/refresh', {}, { withCredentials: true })
        store.dispatch(setToken(data.accessToken))
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        store.dispatch(logout())
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)
```

### Mutex Library
Prevents race conditions when multiple failed requests trigger refresh simultaneously.
```bash
pnpm add async-mutex
```

## 3. Auth Forms

### Login Form Pattern (TypeScript + Plain CSS)
```tsx
// apps/web/src/views/auth/SignIn/SignIn.tsx
import { useState } from 'react'
import { useAppDispatch } from '@/store/hook'
import { login } from '@/store/slices/auth'
import { useNavigate } from 'react-router-dom'

export default function SignIn() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email required'
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email'
    if (!formData.password) newErrors.password = 'Password required'
    if (formData.password.length < 8) newErrors.password = 'Min 8 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await dispatch(login(formData)).unwrap()
      navigate('/home')
    } catch (err) {
      setErrors({ form: err.message || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {errors.form && <div className="error-banner">{errors.form}</div>}

      <div className="form-field">
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email"
          disabled={loading}
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-field">
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Password"
          disabled={loading}
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Validation Alternatives
- **No library needed**: Manual validation works for simple login/register forms
- **Optional**: `zod` (already in shared package) for complex forms
- **Avoid**: react-hook-form adds overhead for 2-3 field forms

## 4. Route Protection Integration

### Update Existing ProtectedRoute
```tsx
// apps/web/src/components/route/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hook'

export default function ProtectedRoute() {
  const { signedIn, token } = useAppSelector((state) => state.auth)

  // ✅ Real auth check (remove hardcoded authenticated = true)
  if (!signedIn || !token) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
```

### Update PublicRoute (prevent logged-in users accessing login page)
```tsx
// apps/web/src/components/route/PublicRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hook'
import { AUTHENTICATED_ENTRY_PATH } from '@/configs/app.config'

export default function PublicRoute() {
  const { signedIn } = useAppSelector((state) => state.auth)

  if (signedIn) {
    return <Navigate to={AUTHENTICATED_ENTRY_PATH} replace />
  }

  return <Outlet />
}
```

### Auth Slice Actions
```typescript
// apps/web/src/store/slices/auth/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send/receive httpOnly cookies
      body: JSON.stringify(credentials)
    })
    if (!response.ok) throw new Error('Login failed')
    return response.json() // { accessToken, user }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: { signedIn: false, token: null, user: null },
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload
      state.signedIn = true
    },
    logout: (state) => {
      state.signedIn = false
      state.token = null
      state.user = null
    }
  },
  extraReducers: (builder) => {
    builder.addCase(login.fulfilled, (state, action) => {
      state.token = action.payload.accessToken
      state.user = action.payload.user
      state.signedIn = true
    })
  }
})
```

## 5. Logout Flow

### Complete Logout Implementation
```typescript
// apps/web/src/store/slices/auth/authSlice.ts
export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  // 1. Notify backend (clears httpOnly refresh cookie)
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  })

  // 2. Clear Redux state
  dispatch(logout())

  // 3. Clear other persisted data if needed
  // localStorage.removeItem('someOtherData')
})

// In component:
const handleLogout = async () => {
  await dispatch(logoutUser())
  navigate('/sign-in')
}
```

### Persist Config (Critical Fix)
```typescript
// apps/web/src/store/storeSetup.ts
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['theme'], // Only persist theme
  blacklist: ['auth']   // Never persist auth
}
```

### Backend Logout Endpoint
```typescript
// apps/api/src/routes/auth.ts
app.post('/auth/logout', (c) => {
  c.cookie('refreshToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0 // Expire immediately
  })
  return c.json({ message: 'Logged out' })
})
```

## Implementation Checklist

- [ ] Remove `auth` from redux-persist whitelist
- [ ] Update auth slice with login/logout async thunks
- [ ] Create API interceptor (RTK Query custom baseQuery OR axios)
- [ ] Remove hardcoded `authenticated = true` in ProtectedRoute
- [ ] Create SignIn/SignUp views with validation
- [ ] Add refresh token endpoint to backend (returns new access token)
- [ ] Configure httpOnly cookies in backend (secure, sameSite: strict)
- [ ] Test token refresh flow on 401 responses
- [ ] Test logout clears state and redirects

## Unresolved Questions

1. Token expiration duration? (Recommend: access=15min, refresh=7d)
2. CSRF protection needed? (Yes if cookies used, add CSRF token header)
3. Remember me feature? (Extend refresh token expiry)
4. Social auth (Google/GitHub)? (Requires OAuth flow research)

---

## Sources

- [JWT Storage in React: Local Storage vs Cookies Security Battle](https://cybersiara.co/blog/react-jwt-storage-guide/)
- [LocalStorage vs Cookies: JWT Token Storage Guide](https://www.cyberchief.ai/2023/05/secure-jwt-token-storage.html)
- [The Developer's Guide to JWT Storage](https://www.descope.com/blog/post/developer-guide-jwt-storage)
- [React Redux Toolkit: Refresh Tokens Authentication 2025](https://codevoweb.com/react-redux-toolkit-refresh-token-authentication/)
- [Handling JWT Refresh Tokens in React & Redux](https://github.com/ihaback/refresh-token-redux-toolkit)
- [React + Redux: Refresh Token with Axios](https://www.bezkoder.com/redux-refresh-token-axios/)
- [Creating Protected Routes With React Router V6](https://medium.com/@dennisivy/creating-protected-routes-with-react-router-v6-2c4bbaf7bc1c)
- [Authentication with React Router v6](https://blog.logrocket.com/authentication-react-router-v6/)
- [Implementing Authentication in React-Redux](https://medium.com/@vk.vishalkora/implementing-authentication-and-protected-routes-in-a-react-redux-application-3bcbce3a57fb)
- [Best Practices for Handling Forms in React (2025)](https://medium.com/@farzanekazemi8517/best-practices-for-handling-forms-in-react-2025-edition-62572b14452f)
- [Form Validation in React](https://www.tatvasoft.com/outsourcing/2025/06/react-form-validation.html)
- [Clear All State on User Logout via Redux](https://brainbank.cc/jamie/lessons/programming-react/clear-all-state-on-user-logout-via-redux)
- [How to Reset Redux Store State](https://cluemediator.com/how-to-reset-the-state-of-a-redux-store)
- [Implementing Logout Functionality in React](https://useful.codes/implementing-logout-functionality-in-react/)
