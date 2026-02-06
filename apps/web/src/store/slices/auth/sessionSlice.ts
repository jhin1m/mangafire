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
    if (!response.success || !response.data) {
      return rejectWithValue(response.error?.message || 'Login failed')
    }
    return response.data
  }
)

export const signUp = createAsyncThunk(
  `${SLICE_BASE_NAME}/signUp`,
  async (dto: RegisterDto, { rejectWithValue }) => {
    const response = await authService.register(dto)
    if (!response.success || !response.data) {
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
