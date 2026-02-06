import { useEffect, useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hook'
import { Navigate, Outlet } from 'react-router-dom'
import { authService } from '@/services/auth-service'
import { signInSuccess, setUser } from '@/store/slices/auth'

const ProtectedRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)
  const [checking, setChecking] = useState(!authenticated)
  const dispatch = useAppDispatch()

  // Silent refresh: try to restore session from httpOnly cookie
  useEffect(() => {
    if (authenticated) {
      setChecking(false)
      return
    }

    let cancelled = false

    authService
      .refresh()
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          dispatch(signInSuccess(res.data.accessToken))
          dispatch(
            setUser({
              userName: res.data.user.username,
              email: res.data.user.email,
              avatar: res.data.user.avatar || '',
              authority: [res.data.user.role],
            })
          )
        }
        setChecking(false)
      })
      .catch(() => {
        if (cancelled) return
        setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [authenticated, dispatch])

  // Show nothing while checking refresh token
  if (checking) {
    return null
  }

  // Not authenticated → redirect to home (auth is handled via modal)
  if (!authenticated) {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}

export default ProtectedRoute
