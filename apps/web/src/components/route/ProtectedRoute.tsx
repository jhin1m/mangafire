import { useEffect, useState } from 'react'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useAppSelector, useAppDispatch } from '@/store/hook'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth-service'
import { signInSuccess, setUser } from '@/store/slices/auth'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)
  const [checking, setChecking] = useState(!authenticated)
  const dispatch = useAppDispatch()
  const location = useLocation()

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

  if (!authenticated) {
    return (
      <Navigate
        replace
        to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
