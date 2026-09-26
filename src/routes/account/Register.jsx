import { useId, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import AuthCard from '../../components/account/AuthCard'
import GoogleButton from '../../components/account/GoogleButton'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import Seo from '../../components/Seo'

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

const EMPTY = { name: '', email: '', phone: '', password: '', password_confirmation: '' }

export default function Register() {
  const uid = useId()
  const { status, register } = useAuth()
  const location = useLocation()
  const from = location.state?.from || '/account'

  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to={from} replace />

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError('Please check the highlighted fields and try again.')
      } else if (err instanceof ApiError && err.network) {
        setFormError('We couldn’t reach the server. Please check your connection and try again.')
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Seo title="Create Account — DK StyleHub" description="Create a DK StyleHub account." noindex />

      <AuthCard
        eyebrow="Account"
        title="Create an account"
        description="Book faster and keep track of your appointments."
      >
        <GoogleButton redirectTo={from} />

        <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.14em] text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor={`${uid}-name`} className={LABEL}>
              Name
            </label>
            <input
              id={`${uid}-name`}
              className={clsx(FIELD, fieldErrors.name && FIELD_ERROR)}
              value={form.name}
              onChange={update('name')}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
            {fieldErrors.name && <p className="mt-1.5 text-sm text-ink">{fieldErrors.name}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor={`${uid}-email`} className={LABEL}>
              Email
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              className={clsx(FIELD, fieldErrors.email && FIELD_ERROR)}
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email && <p className="mt-1.5 text-sm text-ink">{fieldErrors.email}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor={`${uid}-phone`} className={LABEL}>
              Phone <span className="text-muted">(optional)</span>
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              inputMode="tel"
              className={clsx(FIELD, fieldErrors.phone && FIELD_ERROR)}
              value={form.phone}
              onChange={update('phone')}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && <p className="mt-1.5 text-sm text-ink">{fieldErrors.phone}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor={`${uid}-password`} className={LABEL}>
              Password
            </label>
            <input
              id={`${uid}-password`}
              type="password"
              className={clsx(FIELD, fieldErrors.password && FIELD_ERROR)}
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-ink">{fieldErrors.password}</p>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor={`${uid}-password-confirm`} className={LABEL}>
              Confirm password
            </label>
            <input
              id={`${uid}-password-confirm`}
              type="password"
              className={FIELD}
              value={form.password_confirmation}
              onChange={update('password_confirmation')}
              autoComplete="new-password"
              required
            />
          </div>

          {formError && (
            <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
              {formError}
            </p>
          )}

          <button type="submit" className="btn mt-7 w-full justify-center" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </>
  )
}
