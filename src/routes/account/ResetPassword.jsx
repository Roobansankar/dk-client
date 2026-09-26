import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import AuthCard from '../../components/account/AuthCard'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import Seo from '../../components/Seo'

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

export default function ResetPassword() {
  const uid = useId()
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(
    !token || !email ? 'This reset link is missing information. Please request a new one.' : null,
  )
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await resetPassword({
        token,
        email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      navigate('/login', { replace: true, state: { resetSuccess: true } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError(
          err.fieldErrors().email ||
            'This reset link is invalid or has expired. Please request a new one.',
        )
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
      <Seo title="Reset Password — DK StyleHub" description="Choose a new password for your DK StyleHub account." noindex />

      <AuthCard eyebrow="Account" title="Choose a new password">
        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor={`${uid}-password`} className={LABEL}>
              New password
            </label>
            <input
              id={`${uid}-password`}
              type="password"
              className={clsx(FIELD, fieldErrors.password && FIELD_ERROR)}
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              disabled={!token || !email}
              required
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-ink">{fieldErrors.password}</p>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor={`${uid}-password-confirm`} className={LABEL}>
              Confirm new password
            </label>
            <input
              id={`${uid}-password-confirm`}
              type="password"
              className={FIELD}
              value={form.password_confirmation}
              onChange={update('password_confirmation')}
              autoComplete="new-password"
              disabled={!token || !email}
              required
            />
          </div>

          {formError && (
            <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="btn mt-7 w-full justify-center"
            disabled={submitting || !token || !email}
          >
            {submitting ? 'Saving…' : 'Reset password'}
          </button>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link to="/forgot-password" className="text-ink underline underline-offset-2">
              Request a new link
            </Link>
          </p>
        </form>
      </AuthCard>
    </>
  )
}
