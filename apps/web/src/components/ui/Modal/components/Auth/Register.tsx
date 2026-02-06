import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MODAL_AUTH_ENUM } from '@/@types/modal'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { signUp } from '@/store/slices/auth'
import { registerSchema } from '@mangafire/shared/validators'
import toast from 'react-hot-toast'

type RegisterProps = {
  onOpen: (type: MODAL_AUTH_ENUM) => void
  onClose: () => void
}

const Register = (props: RegisterProps) => {
  const { onOpen, onClose } = props
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const dispatch = useAppDispatch()
  const loading = useAppSelector((state) => state.auth.session.loading)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate all fields with Zod (includes password match check)
    const result = registerSchema.safeParse({
      email,
      username,
      password,
      confirmPassword,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await dispatch(
        signUp({ email, username, password, confirmPassword })
      ).unwrap()
      // Reset form and close modal on success
      setEmail('')
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      onClose()
      toast.success('Account created!')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Registration failed')
    }
  }

  return (
    <>
      <h4 className="text-white">Create an account</h4>
      <p className="text-muted">Create an account to enjoy more features</p>
      <form className="ajax-register mt-2" onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="Your username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          {errors.username && (
            <small className="text-danger">{errors.username}</small>
          )}
        </div>
        <div className="form-group">
          <input
            type="email"
            className="form-control"
            placeholder="Your Email"
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
        <div className="form-group">
          <input
            type="password"
            className="form-control"
            placeholder="Repeat Your Password"
            name="password_confirmation"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          {errors.confirmPassword && (
            <small className="text-danger">{errors.confirmPassword}</small>
          )}
        </div>

        <button
          className="btn my-3 btn-lg btn-primary w-100"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Register'}{' '}
          {!loading && <i className="fa-solid fa-angle-right" />}
        </button>
      </form>
      <div className="text-center">
        Already have an account?{' '}
        <Link
          to="#"
          className="text-primary1 cts-switcher"
          data-target="signin"
          onClick={() => onOpen(MODAL_AUTH_ENUM.LOGIN)}
        >
          Login Now
        </Link>
      </div>
    </>
  )
}

export default Register
