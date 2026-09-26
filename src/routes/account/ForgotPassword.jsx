import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import AuthCard from '../../components/account/AuthCard'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import Seo from '../../components/Seo'

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

export default function ForgotPassword() {
  const uid = useId()
  const { forgotPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldError(null)
    try {
      const data = await forgotPassword(email.trim())
      setSent(data?.message || 'If an account exists for that email, a password reset link has been sent.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldError(err.fieldErrors().email)
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
      <Seo title="Forgot Password — DK StyleHub" description="Reset your DK StyleHub account password." noindex />

      <AuthCard
        eyebrow="Account"
        title="Forgot your password?"
        description="Enter your email and we’ll send you a link to reset it."
      >
        {sent ? (
          <div>
            <p className="border-l-2 border-line-strong pl-4 text-ink-soft">{sent}</p>
            <Link to="/login" className="btn btn-outline mt-7 w-full justify-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor={`${uid}-email`} className={LABEL}>
                Email
              </label>
              <input
                id={`${uid}-email`}
                type="email"
                className={clsx(FIELD, fieldError && FIELD_ERROR)}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldError(null)
                }}
                autoComplete="email"
                aria-invalid={Boolean(fieldError)}
                required
              />
              {fieldError && <p className="mt-1.5 text-sm text-ink">{fieldError}</p>}
            </div>

            {formError && (
              <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
                {formError}
              </p>
            )}

            <button type="submit" className="btn mt-7 w-full justify-center" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="mt-6 text-center text-sm text-ink-soft">
              <Link to="/login" className="text-ink underline underline-offset-2">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </AuthCard>
    </>
  )
}
