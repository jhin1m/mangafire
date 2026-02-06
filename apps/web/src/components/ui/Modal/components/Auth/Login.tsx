import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MODAL_AUTH_ENUM } from '@/@types/modal'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { signIn } from '@/store/slices/auth'
import { loginSchema } from '@mangafire/shared/validators'
import toast from 'react-hot-toast'

type LoginProps = {
  onOpen: (type: MODAL_AUTH_ENUM) => void
  onClose: () => void
}

const Login = (props: LoginProps) => {
  const { onOpen, onClose } = props
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const dispatch = useAppDispatch()
  const loading = useAppSelector((state) => state.auth.session.loading)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate input with Zod before sending to API
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
      // Reset form and close modal on success
      setEmail('')
      setPassword('')
      onClose()
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed')
    }
  }

  return (
    <>
      <h4 className="text-white">Welcome back!</h4>
      <p className="text-muted">Sign in to your account</p>
      <form className="ajax-login mt-2" onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="Email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {errors.email && (
            <small className="text-danger">{errors.email}</small>
          )}
        </div>
        <div className="form-group">
          <input
            type="password"
            className="form-control"
            placeholder="Your Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {errors.password && (
            <small className="text-danger">{errors.password}</small>
          )}
        </div>
        <div className="form-group text-center">
          <Link
            to="#"
            className="cts-switcher"
            data-target="forgot"
            onClick={() => onOpen(MODAL_AUTH_ENUM.FORGOT)}
          >
            Forgot Your Password?
          </Link>
        </div>
        <button
          className="btn my-3 btn-lg btn-primary w-100"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Login Now'}{' '}
          {!loading && <i className="fa-solid fa-angle-right" />}
        </button>
      </form>
      <div className="text-center">
        Don't have an account?{' '}
        <Link
          className="text-primary1 cts-switcher"
          to="#"
          data-target="signup"
          onClick={() => onOpen(MODAL_AUTH_ENUM.REGISTER)}
        >
          Register Now
        </Link>
      </div>
    </>
  )
}

export default Login
