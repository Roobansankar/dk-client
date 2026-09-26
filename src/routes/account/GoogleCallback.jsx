import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/account/AuthCard'
import { useAuth } from '../../context/AuthContext'
import Seo from '../../components/Seo'

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
  // Where to go afterwards. Read once, without side effects: rendering can run
  // more than once (StrictMode), so deleting the stashed value while rendering
  // would leave later renders with nothing and fall back to /account. It is
  // cleared below, once sign-in has finished.
  const [redirectTo] = useState(
    () => sessionStorage.getItem('dk-post-login-redirect') || '/account',
  )
  const started = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    applyToken(token).finally(() => {
      sessionStorage.removeItem('dk-post-login-redirect')
      setDone(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) return <Navigate to="/login?google_error=1" replace />

  if (done) return <Navigate to={redirectTo} replace />

  return (
    <>
      <Seo title="Signing in — DK StyleHub" noindex />
      <AuthCard eyebrow="Account" title="Signing you in…">
        <p className="text-center text-ink-soft">One moment while we finish signing you in.</p>
      </AuthCard>
    </>
  )
}
