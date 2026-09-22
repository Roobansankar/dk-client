import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/account/AuthCard'
import GoogleButton from '../../components/account/GoogleButton'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { status } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = location.state?.from || '/account'

  /*
   * Email/password authentication is intentionally disabled from the
   * customer-facing UI. The existing backend authentication flow is left
   * untouched so this change remains reversible without affecting the
   * underlying account/session infrastructure.
   *
   * Previous email-login implementation:
   *
   * const uid = useId()
   * const { status, login } = useAuth()
   *
   * const [form, setForm] = useState({ email: '', password: '' })
   * const [fieldErrors, setFieldErrors] = useState({})
   * const [submitting, setSubmitting] = useState(false)
   *
   * const update = (key) => (event) => {
   *   setForm((prev) => ({ ...prev, [key]: event.target.value }))
   *   setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
   * }
   *
   * const handleSubmit = async (event) => {
   *   event.preventDefault()
   *   setSubmitting(true)
   *   ...
   * }
   */

  if (status === 'authed') return <Navigate to={from} replace />

  const googleError = searchParams.get('google_error')
    ? 'Google sign-in didn’t complete. Please try again.'
    : null

  return (
    <>
      <title>Sign In — DK StyleHub</title>
      <meta name="description" content="Sign in to your DK StyleHub account." />

      <AuthCard
        eyebrow="Account"
        title="Sign in"
        description="Access your profile and appointment history."
      >
        {googleError && (
          <p role="alert" className="mb-6 border-l-2 border-ink pl-4 text-sm text-ink">
            {googleError}
          </p>
        )}

        <GoogleButton redirectTo={from} />

        {/*
          Email/password customer authentication is intentionally disabled.

          The previous UI included:
          - OR divider
          - Email field
          - Password field
          - Forgot password link
          - Email sign-in button
          - Create account link

          It is kept commented out rather than deleted so the change remains
          easy to reverse without modifying the underlying authentication
          infrastructure.
        */}

        {/*
        <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.14em] text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor={`${uid}-email`} className="eyebrow block">
              Email
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              className={clsx(
                'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted',
                fieldErrors.email && 'border-ink!',
              )}
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-sm text-ink">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${uid}-password`} className="eyebrow block">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-ink-soft hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id={`${uid}-password`}
              type="password"
              className={clsx(
                'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted',
                fieldErrors.password && 'border-ink!',
              )}
              value={form.password}
              onChange={update('password')}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />

            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-ink">{fieldErrors.password}</p>
            )}
          </div>

          {formError && (
            <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="btn mt-7 w-full justify-center"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          New to DK StyleHub?{' '}
          <Link
            to="/register"
            className="text-ink underline underline-offset-2"
          >
            Create an account
          </Link>
        </p>
        */}
      </AuthCard>
    </>
  )
}