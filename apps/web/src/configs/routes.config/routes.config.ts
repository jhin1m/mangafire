import { Routes } from '@/@types/routes'
import authRoute from './authRoute'
import appsRoute from './appsRoute'

// Auth routes: only shown to unauthenticated users (sign-in, sign-up)
export const publicRoutes: Routes = [...authRoute]

// Browsing routes: accessible to everyone (no auth required)
export const browsingRoutes: Routes = [...appsRoute]

// Protected routes: require authentication (admin features, future use)
export const protectedRoutes: Routes = []
