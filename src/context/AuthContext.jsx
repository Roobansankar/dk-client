import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, customerTokenStore, setCustomerUnauthorizedHandler } from '../lib/api'

/**
 * Customer (public-site) authentication — mirrors admin/lib/auth.jsx's shape
 * (`status: guest|loading|authed`, `login`/`logout`/`reload`) but talks to
 * `/account/*` and uses `customerTokenStore`, so a staff session and a
 * customer session never share or clobber one token slot.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() =>
    customerTokenStore.get() ? 'loading' : 'guest',
  )

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/account/me')
      setUser(data)
      setStatus('authed')
    } catch {
      customerTokenStore.set(null)
      setUser(null)
      setStatus('guest')
    }
  }, [])

  useEffect(() => {
    setCustomerUnauthorizedHandler(() => {
      customerTokenStore.set(null)
      setUser(null)
      setStatus('guest')
    })
    if (!customerTokenStore.get()) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMe()
  }, [fetchMe])

  const applySession = useCallback((body) => {
    customerTokenStore.set(body.token)
    setUser(body.user)
    setStatus('authed')
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { data: raw } = await api.post('/account/login', { email, password })
      applySession(raw ?? {})
    },
    [applySession],
  )

  const register = useCallback(
    async ({ name, email, phone, password, password_confirmation }) => {
      const { data: raw } = await api.post('/account/register', {
        name,
        email,
        phone: phone || undefined,
        password,
        password_confirmation,
      })
      applySession(raw ?? {})
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/account/logout')
    } catch {
      /* revoke locally regardless */
    }
    customerTokenStore.set(null)
    setUser(null)
    setStatus('guest')
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const { data } = await api.post('/account/forgot-password', { email })
    return data
  }, [])

  const resetPassword = useCallback(async (payload) => {
    const { data } = await api.post('/account/reset-password', payload)
    return data
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/account/profile', payload)
    setUser(data)
    return data
  }, [])

  const updatePassword = useCallback(async (payload) => {
    const { data } = await api.put('/account/password', payload)
    return data
  }, [])

  /** Used by the Google OAuth callback page once it has the token from the URL. */
  const applyToken = useCallback(
    (token) => {
      customerTokenStore.set(token)
      setStatus('loading')
      return fetchMe()
    },
    [fetchMe],
  )

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      updatePassword,
      applyToken,
      reload: fetchMe,
    }),
    [
      user,
      status,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      updatePassword,
      applyToken,
      fetchMe,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
