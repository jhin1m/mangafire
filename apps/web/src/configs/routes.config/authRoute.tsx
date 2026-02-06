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
