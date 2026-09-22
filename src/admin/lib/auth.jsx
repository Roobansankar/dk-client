import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, setUnauthorizedHandler, tokenStore } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() =>
    tokenStore.get() ? 'loading' : 'guest',
  ) // loading | authed | guest

  // Assumes a token is present; resolves it against /auth/me. All state writes
  // happen after an await, so this is safe to call from an effect.
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      setStatus('authed')
    } catch {
      tokenStore.set(null)
      setUser(null)
      setStatus('guest')
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null)
      setUser(null)
      setStatus('guest')
    })
    if (!tokenStore.get()) return
    // Async session hydration: every state write is behind an await, so this is
    // the "fetching data" pattern, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMe()
  }, [fetchMe])

  const login = useCallback(async (email, password) => {
    const { data: raw } = await api.post('/auth/login', {
      email,
      password,
      device_name: 'admin-web',
    })
    const body = raw ?? {} // login response isn't a resource: { token, user }
    tokenStore.set(body.token)
    setUser(body.user)
    setStatus('authed')
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* revoke locally regardless */
    }
    tokenStore.set(null)
    setUser(null)
    setStatus('guest')
  }, [])

  /**
   * Self password change — mirrors the customer AuthContext's updatePassword
   * exactly. The server keeps this session's token alive (only every other
   * token is revoked), so there's no local sign-out here.
   */
  const changePassword = useCallback(async (payload) => {
    const { data } = await api.put('/auth/password', payload)
    return data
  }, [])

  const permissions = useMemo(() => new Set(user?.permissions ?? []), [user])
  const isSuperadmin = (user?.roles ?? []).includes('superadmin')

  const can = useCallback(
    (perm) => isSuperadmin || permissions.has(perm),
    [isSuperadmin, permissions],
  )

  const value = useMemo(
    () => ({ user, status, login, logout, changePassword, can, isSuperadmin, reload: fetchMe }),
    [user, status, login, logout, changePassword, can, isSuperadmin, fetchMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
