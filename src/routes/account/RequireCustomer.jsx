import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthCard from '../../components/account/AuthCard'

/** Guest → redirected to /login (remembering where to come back to). */
export default function RequireCustomer({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <AuthCard eyebrow="Account" title="Loading…">
        <p className="text-center text-ink-soft">One moment…</p>
      </AuthCard>
    )
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
