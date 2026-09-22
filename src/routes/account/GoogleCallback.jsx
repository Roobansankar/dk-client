import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/account/AuthCard'
import { useAuth } from '../../context/AuthContext'

/**
 * Lands here after the full-page round trip to Google and back
 * (see routes/api.php's account/google/callback). Reads the one-time token
 * from the query string, stores it, hydrates the session, then redirects —
 * to wherever GoogleButton stashed in sessionStorage before leaving the SPA.
 */
export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const { applyToken } = useAuth()
  const [done, setDone] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) return
    applyToken(token).finally(() => setDone(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) return <Navigate to="/login?google_error=1" replace />

  if (done) {
    const redirectTo = sessionStorage.getItem('dk-post-login-redirect') || '/account'
    sessionStorage.removeItem('dk-post-login-redirect')
    return <Navigate to={redirectTo} replace />
  }

  return (
    <AuthCard eyebrow="Account" title="Signing you in…">
      <p className="text-center text-ink-soft">One moment while we finish signing you in.</p>
    </AuthCard>
  )
}
