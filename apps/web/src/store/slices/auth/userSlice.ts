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
