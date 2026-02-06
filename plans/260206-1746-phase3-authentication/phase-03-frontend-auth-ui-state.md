# Phase 03: Frontend Auth UI & State

## Context

- **Plan**: [plan.md](./plan.md)
- **Depends on**: Phase 01 (shared types/validators must exist)
- **Blocks**: Phase 04
- **Parallelization**: Can run in parallel with Phase 02. ~2.5h effort.

## Overview

Build login/register views, auth API service layer, update Redux auth slices with real async thunks, and configure auth routes. Does NOT touch route guards or store persistence (Phase 04).

## Key Insights

- Existing auth slice has `sessionSlice` (signedIn, token) and `userSlice` (avatar, userName, email, authority) -- will enhance both
- Project uses plain CSS (no Tailwind), dark theme (#0e1726), modular CSS imports in `index.css`
- Project uses plain `fetch` -- no axios dependency
- Route type: `{ key, path, component, authority }` with `React.lazy()`
- Form validation: manual with Zod schemas from shared package (no react-hook-form)
- Existing constants: `REDIRECT_URL_KEY = 'redirectUrl'`, `unAuthenticatedEntryPath: '/sign-in'`
- Toast notifications via `react-hot-toast`

## Requirements

1. Auth service: API calls for register, login, logout, refresh, getProfile, updateProfile
2. Login page (`/sign-in`): email + password form, loading state, error display, link to register
3. Register page (`/sign-up`): email + username + password + confirm form, loading state, link to login
4. Update `sessionSlice`: add async thunks for login, register, logout
5. Update `userSlice`: populate from auth response
6. Auth route config: add `/sign-in` and `/sign-up` to `authRoute.tsx`
7. Auth CSS: form styling consistent with dark theme

## Architecture

### Component Tree

```
/sign-in → SignIn (view)
  └── AuthForm (email, password, submit)
       └── Manual validation via loginSchema

/sign-up → SignUp (view)
  └── AuthForm (email, username, password, confirmPassword, submit)
       └── Manual validation via registerSchema
```

### State Flow

```
User submits login form
  → dispatch(signIn({ email, password }))
  → authService.login(dto)
  → API returns { user, accessToken }
  → sessionSlice: signedIn=true, token=accessToken
  → userSlice: set user data
  → redirect to authenticatedEntryPath
```

### API Service Pattern

```typescript
// Plain fetch with base URL from app.config
const API_BASE = '/api/auth'

async function login(dto: LoginDto): Promise<ApiResponse<AuthResponse>>
async function register(dto: RegisterDto): Promise<ApiResponse<AuthResponse>>
async function logout(): Promise<void>
async function refresh(): Promise<ApiResponse<AuthResponse>>
async function getProfile(token: string): Promise<ApiResponse<AuthUser>>
async function updateProfile(token: string, dto: UpdateProfileDto): Promise<ApiResponse<AuthUser>>
```

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/services/auth-service.ts` | CREATE | API calls for all auth endpoints |
| `apps/web/src/views/auth/SignIn.tsx` | CREATE | Login page view |
| `apps/web/src/views/auth/SignUp.tsx` | CREATE | Register page view |
| `apps/web/src/views/auth/index.ts` | CREATE | Barrel export |
| `apps/web/src/store/slices/auth/sessionSlice.ts` | MODIFY | Add async thunks |
| `apps/web/src/store/slices/auth/userSlice.ts` | MODIFY | Update types + setUser usage |
| `apps/web/src/store/slices/auth/index.ts` | MODIFY | Re-export new thunks if needed |
| `apps/web/src/configs/routes.config/authRoute.tsx` | MODIFY | Add sign-in/sign-up routes |
| `apps/web/src/assets/css/auth.css` | CREATE | Auth form styles |
| `apps/web/src/index.css` | MODIFY | Add auth.css import |

## File Ownership

Only this phase touches the files listed above. No other phase may modify them.

## Implementation Steps

### Step 1: Create auth service (`apps/web/src/services/auth-service.ts`)

```typescript
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
```

### Step 2: Update sessionSlice (`apps/web/src/store/slices/auth/sessionSlice.ts`)

Keep existing `signInSuccess`/`signOutSuccess` reducers. Add async thunks:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authService } from '@/services/auth-service'
import { SLICE_BASE_NAME } from './constants'
import type { LoginDto, RegisterDto } from '@mangafire/shared/types'

export interface SessionState {
  signedIn: boolean
  token: string | null
  loading: boolean
}

const initialState: SessionState = {
  signedIn: false,
  token: null,
  loading: false,
}

export const signIn = createAsyncThunk(
  `${SLICE_BASE_NAME}/signIn`,
  async (dto: LoginDto, { rejectWithValue }) => {
    const response = await authService.login(dto)
    if (!response.success) {
      return rejectWithValue(response.error?.message || 'Login failed')
    }
    return response.data
  }
)

export const signUp = createAsyncThunk(
  `${SLICE_BASE_NAME}/signUp`,
  async (dto: RegisterDto, { rejectWithValue }) => {
    const response = await authService.register(dto)
    if (!response.success) {
      return rejectWithValue(response.error?.message || 'Registration failed')
    }
    return response.data
  }
)

export const signOut = createAsyncThunk(
  `${SLICE_BASE_NAME}/signOut`,
  async () => {
    await authService.logout()
  }
)

const sessionSlice = createSlice({
  name: `${SLICE_BASE_NAME}/session`,
  initialState,
  reducers: {
    signInSuccess(state, action: PayloadAction<string>) {
      state.signedIn = true
      state.token = action.payload
    },
    signOutSuccess(state) {
      state.signedIn = false
      state.token = null
    },
  },
  extraReducers: (builder) => {
    // signIn
    builder.addCase(signIn.pending, (state) => { state.loading = true })
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.loading = false
      state.signedIn = true
      state.token = action.payload.accessToken
    })
    builder.addCase(signIn.rejected, (state) => { state.loading = false })

    // signUp
    builder.addCase(signUp.pending, (state) => { state.loading = true })
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.loading = false
      state.signedIn = true
      state.token = action.payload.accessToken
    })
    builder.addCase(signUp.rejected, (state) => { state.loading = false })

    // signOut
    builder.addCase(signOut.fulfilled, (state) => {
      state.signedIn = false
      state.token = null
    })
  },
})

export const { signInSuccess, signOutSuccess } = sessionSlice.actions
export default sessionSlice.reducer
```

### Step 3: Update userSlice (`apps/web/src/store/slices/auth/userSlice.ts`)

Add extraReducers to populate user from signIn/signUp thunks:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { signIn, signUp, signOut } from './sessionSlice'

export type UserState = {
  avatar?: string
  userName?: string
  email?: string
  authority?: string[]
}

const initialState: UserState = {
  avatar: '',
  userName: '',
  email: '',
  authority: [],
}

const userSlice = createSlice({
  name: `${SLICE_BASE_NAME}/user`,
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      state.avatar = action.payload?.avatar
      state.email = action.payload?.email
      state.userName = action.payload?.userName
      state.authority = action.payload?.authority
    },
  },
  extraReducers: (builder) => {
    const handleAuthSuccess = (state: UserState, action: any) => {
      const user = action.payload.user
      state.userName = user.username
      state.email = user.email
      state.avatar = user.avatar || ''
      state.authority = [user.role]
    }

    builder.addCase(signIn.fulfilled, handleAuthSuccess)
    builder.addCase(signUp.fulfilled, handleAuthSuccess)
    builder.addCase(signOut.fulfilled, () => initialState)
  },
})

export const { setUser } = userSlice.actions
export default userSlice.reducer
```

### Step 4: Update auth slice index (`apps/web/src/store/slices/auth/index.ts`)

```typescript
import { combineReducers } from '@reduxjs/toolkit'
import session, { SessionState } from './sessionSlice'
import user, { UserState } from './userSlice'

const reducer = combineReducers({
  session,
  user,
})

export type AuthState = {
  session: SessionState
  user: UserState
}

export * from './sessionSlice'
export * from './userSlice'

export default reducer
```

### Step 5: Create SignIn view (`apps/web/src/views/auth/SignIn.tsx`)

```tsx
import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { signIn } from '@/store/slices/auth'
import { loginSchema } from '@mangafire/shared/validators'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'
import toast from 'react-hot-toast'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loading = useAppSelector((state) => state.auth.session.loading)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await dispatch(signIn({ email, password })).unwrap()
      const redirectUrl = searchParams.get(REDIRECT_URL_KEY)
      navigate(redirectUrl || appConfig.authenticatedEntryPath)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Welcome back to MangaFire</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/sign-up">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}

export default SignIn
```

### Step 6: Create SignUp view (`apps/web/src/views/auth/SignUp.tsx`)

Similar pattern to SignIn but with username, confirmPassword fields and `registerSchema` validation. Dispatches `signUp` thunk. Links to `/sign-in`.

### Step 7: Create barrel export (`apps/web/src/views/auth/index.ts`)

```typescript
export { default as SignIn } from './SignIn'
export { default as SignUp } from './SignUp'
```

### Step 8: Update authRoute.tsx

```tsx
import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const authRoute: Routes = [
  {
    key: 'auth.signIn',
    path: '/sign-in',
    component: lazy(() => import('@/views/auth/SignIn')),
    authority: [],
  },
  {
    key: 'auth.signUp',
    path: '/sign-up',
    component: lazy(() => import('@/views/auth/SignUp')),
    authority: [],
  },
]

export default authRoute
```

### Step 9: Create auth CSS (`apps/web/src/assets/css/auth.css`)

Consistent with dark theme. Key classes:
- `.auth-container` -- full-page centering, min-height 100vh
- `.auth-card` -- max-width 400px, dark card (#1a2332), rounded, padding
- `.auth-title` / `.auth-subtitle` -- typography
- `.form-group` -- label + input + error stacking
- `.form-group input` -- dark input (#0e1726), border, focus ring
- `.form-error` -- red text, small font
- `.auth-btn` -- primary button, full width, hover/disabled states
- `.auth-footer` -- link styling

### Step 10: Add CSS import to index.css

Add `@import './assets/css/auth.css';` to `apps/web/src/index.css`.

## Todo List

- [ ] Create `apps/web/src/services/auth-service.ts`
- [ ] Update `sessionSlice.ts` with async thunks + loading state
- [ ] Update `userSlice.ts` with extraReducers for auth thunks
- [ ] Update `auth/index.ts` barrel
- [ ] Create `SignIn.tsx` view
- [ ] Create `SignUp.tsx` view
- [ ] Create `views/auth/index.ts` barrel
- [ ] Update `authRoute.tsx` with sign-in/sign-up routes
- [ ] Create `auth.css`
- [ ] Add import to `index.css`
- [ ] Run `pnpm type-check` in web app

## Success Criteria

- `/sign-in` and `/sign-up` render without errors
- Form validation shows inline errors from Zod schemas
- Dispatch `signIn`/`signUp` thunks call API and update Redux state
- `signOut` thunk clears session + user state
- Loading states disable form during API call
- `pnpm type-check` passes in `apps/web`
- CSS matches dark theme aesthetic

## Conflict Prevention

- Creates new files only in `views/auth/`, `services/`
- Modifies only auth slice files (owned exclusively)
- Does NOT touch `ProtectedRoute.tsx`, `PublicRoute.tsx`, `storeSetup.ts`, `app.config.ts` (Phase 04)
- Does NOT add any route guards logic

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared types not available yet (Phase 01 incomplete) | Blocks | Wait for Phase 01; can stub types temporarily |
| Redux async thunk typing issues | Medium | Use `createAsyncThunk` generic params explicitly |
| CSS conflicts with existing styles | Low | Scoped class names with `auth-` prefix |

## Security Considerations

- Password fields use `type="password"`
- Access token stored only in Redux memory (not persisted) -- persistence removal is Phase 04
- API calls use `credentials: 'include'` for httpOnly cookie
- No token stored in localStorage or sessionStorage
- Form clears on successful auth (navigation away)

## Next Steps

After completion, Phase 04 can begin (once Phase 02 also completes).
