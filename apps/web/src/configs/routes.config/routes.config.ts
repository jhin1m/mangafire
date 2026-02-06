import { Routes } from '@/@types/routes'
import appsRoute from './appsRoute'

// Browsing routes: accessible to everyone (no auth required)
export const browsingRoutes: Routes = [...appsRoute]

// Protected routes: require authentication (admin features, future use)
export const protectedRoutes: Routes = []
