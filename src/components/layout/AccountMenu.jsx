import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, User, UserRound } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/**
 * Navbar profile affordance. Guest: a plain login link. Authenticated: an
 * avatar (Google avatar, or initials fallback) that opens a tiny menu with
 * "My Account" and "Log out" — a self-contained popover (outside-click +
 * Escape), not the admin's CSS-var-themed Dropdown, which belongs to a
 * different design system (see admin-design-system).
 */
export default function AccountMenu({ onDark = false }) {
  const { status, user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const iconButton = clsx(
    '-mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
    'text-ink-soft hover:bg-surface-sunken hover:text-ink',
    onDark &&
      'lg:text-white lg:[text-shadow:0_1px_10px_rgb(0_0_0/0.4)] lg:hover:bg-white/10 lg:hover:text-white',
  )

  if (status !== 'authed') {
    return (
      <Link to="/login" aria-label="Sign in" title="Sign in" className={iconButton}>
        <User size={18} aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={clsx(
          'flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-sunken',
          onDark && 'lg:hover:bg-white/10',
        )}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-soft',
              onDark && 'lg:bg-white/15 lg:text-white',
            )}
          >
            {initials(user?.name)}
          </span>
        )}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={clsx('text-muted', onDark && 'lg:text-white/70')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-sm border border-line bg-surface py-1.5 text-ink shadow-lg"
        >
          <div className="border-b border-line px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-soft no-underline hover:bg-surface-sunken hover:text-ink"
          >
            <UserRound size={15} aria-hidden="true" />
            My account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink-soft hover:bg-surface-sunken hover:text-ink"
          >
            <LogOut size={15} aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
