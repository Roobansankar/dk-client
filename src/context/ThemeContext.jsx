import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Public-site theme. Three preferences — 'light' | 'dark' | 'system' — persisted
 * to localStorage. The resolved light/dark value is written to
 * `document.documentElement.dataset.theme`; index.html sets the same attribute
 * before first paint so there is no flash. Mirrors the admin's lib/theme.jsx.
 */

const KEY = 'dk-theme'
const ThemeContext = createContext(null)

const systemDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches

function apply(pref) {
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [pref, setPref] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    apply(pref)
    try {
      localStorage.setItem(KEY, pref)
    } catch {
      /* private mode — session only */
    }
  }, [pref])

  useEffect(() => {
    if (pref !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const resolved = pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref

  // Two-state flip: from wherever we are (including 'system'), go to the
  // opposite of the theme currently on screen. 'system' is never re-selected
  // from the UI, so there is no third toggle state.
  const cycle = useCallback(() => {
    setPref((p) => {
      const dark = p === 'dark' || (p === 'system' && systemDark())
      return dark ? 'light' : 'dark'
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref, cycle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
