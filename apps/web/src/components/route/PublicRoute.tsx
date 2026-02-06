import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hook'
import appConfig from '@/configs/app.config'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
  const authenticated = useAppSelector((state) => state.auth.session.signedIn)

  return authenticated ? (
    <Navigate to={authenticatedEntryPath} />
  ) : (
    <Outlet />
  )
}

export default PublicRoute
