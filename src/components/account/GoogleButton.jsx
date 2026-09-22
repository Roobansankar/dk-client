import { useState } from 'react'
import { apiGet, ApiError } from '../../lib/api'

/** A plain "G" mark — no external asset/font needed. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

/**
 * "Continue with Google" — hits GET /account/google/redirect and follows the
 * real accounts.google.com URL it returns. Fails gracefully (no crash, no
 * fake success) if Google sign-in isn't configured server-side.
 */
export default function GoogleButton({ redirectTo = '/account' }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const start = async () => {
    setPending(true)
    setError(null)
    try {
      // The full OAuth round trip leaves the SPA entirely (redirect ->
      // Google -> backend callback -> back to the SPA), so there's no React
      // state left to carry a "return to" location — stash it here instead.
      sessionStorage.setItem('dk-post-login-redirect', redirectTo)
      const { url } = await apiGet('/account/google/redirect')
      window.location.href = url
    } catch (err) {
      sessionStorage.removeItem('dk-post-login-redirect')
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not start Google sign-in. Please try again.',
      )
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="btn btn-outline w-full justify-center gap-2.5"
      >
        <GoogleMark />
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  )
}
