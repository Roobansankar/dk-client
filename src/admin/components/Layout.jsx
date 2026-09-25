import { useId, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  History,
  Images,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Moon,
  Package,
  ReceiptText,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  Tags,
  Monitor as MonitorIcon,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { useTheme } from '../lib/theme'
import logoDark from '../../assets/images/Black-logo.webp'
import logoLight from '../../assets/images/White-logo.png'
import { Button, cn, Dropdown, DropdownItem, Field, TextInput } from './ui'
import { Modal } from './Modal'
import { initials } from '../lib/format'

// Information architecture — grouped by the studio's operational areas.
// Routes, permissions and features are unchanged; only order and grouping.
// Administration (Users / Roles / Settings) lives in the header menu, not here.
const NAV = [
  { section: 'Overview' },
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', end: true },

  { section: 'Appointments' },
  { to: '/admin/appointments', label: 'All Appointments', icon: CalendarDays, perm: 'appointments.view', end: true },
  { to: '/admin/appointments/history', label: 'Appointment History', icon: History, perm: 'appointments.view' },
  { to: '/admin/appointments/offline/new', label: 'New Offline Appointment', icon: CalendarPlus, perm: 'appointments.offline' },

  { section: 'Payments & Reports' },
  { to: '/admin/payments', label: 'Payments & Completed', icon: ReceiptText, perm: 'payments.view' },

  { section: 'Shop' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, perm: 'orders.view' },

  { section: 'Catalogue' },
  { to: '/admin/services/female', label: 'Female Services', icon: Scissors, perm: 'services.view' },
  { to: '/admin/services/male', label: 'Male Services', icon: Scissors, perm: 'services.view' },
  { to: '/admin/products', label: 'Products', icon: Package, perm: 'products.view' },
  { to: '/admin/combos', label: 'Product Combos', icon: Layers, perm: 'products.view' },
  { to: '/admin/pricing-plans', label: 'Pricing Plans', icon: Tags, perm: 'pricing.view' },

  { section: 'Studio' },
  { to: '/admin/stylists', label: 'Stylists', icon: UserRound, perm: 'stylists.view' },
  { to: '/admin/gallery', label: 'Gallery', icon: Images, perm: 'gallery.view' },
  { to: '/admin/videos', label: 'Videos', icon: Video, perm: 'videos.view' },

  { section: 'Marketing' },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote, perm: 'reviews.view' },
]

// Administration destinations — surfaced through the header menu and the
// Settings shortcut. Same routes and permissions as before.
const ADMIN_NAV = [
  { to: '/admin/users', label: 'Users', icon: Users, perm: 'users.view' },
  { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck, perm: 'roles.view' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.view' },
]

const SIDEBAR_KEY = 'dk-admin-sidebar'

export function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'
    } catch {
      return false
    }
  })
  const closeMobile = () => setMobileOpen(false)
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded')
      } catch {
        /* private mode — state still works in memory */
      }
      return next
    })
  }

  return (
    <div className="min-h-svh bg-[var(--color-paper)] lg:grid lg:grid-cols-[auto_1fr]">
      {/* Desktop sidebar — outer cell carries the surface so it never seams on scroll */}
      <div className="hidden border-r border-[var(--color-line)] bg-[var(--color-surface)] lg:block">
        <aside
          className={cn(
            'sidebar-rail sticky top-0 flex h-svh flex-col overflow-hidden',
            collapsed ? 'w-[4.25rem]' : 'w-[15.75rem]',
          )}
          data-collapsed={collapsed}
        >
          <Sidebar collapsed={collapsed} />
        </aside>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
          <div
            className="absolute inset-0 bg-[rgb(17_17_16_/_0.5)]"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[84vw] flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]"
            style={{ animation: 'drawer-in 200ms var(--ease-standard)' }}
          >
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="btn-ghost absolute right-2 top-3 rounded p-1.5 text-[var(--color-muted)]"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ collapsed = false, onNavigate }) {
  const { can, isSuperadmin } = useAuth()
  const allowed = NAV.filter((item) => item.section || !item.perm || can(item.perm))
  // Drop a section header when the current role can see none of its links.
  const visible = allowed.filter((item, i) =>
    item.section ? allowed.slice(i + 1).find((n) => n.section || n.to)?.to != null : true,
  )

  return (
    <>
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b border-[var(--color-line)]',
          collapsed ? 'justify-center px-0' : 'px-5',
        )}
      >
        {/* Black logo on the light theme, white on the dark theme. */}
        <img
          src={logoDark}
          alt="DK StyleHub Admin"
          title="DK StyleHub Admin"
          className="h-8 w-auto shrink-0 object-contain dark:hidden"
        />
        <img
          src={logoLight}
          alt="DK StyleHub Admin"
          title="DK StyleHub Admin"
          className="hidden h-8 w-auto shrink-0 object-contain dark:block"
        />
        {!collapsed && (
          <div className="sidebar-label leading-tight">
            <p className="text-sm font-bold tracking-[-0.01em] text-[var(--color-ink)]">
              DK StyleHub
            </p>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-faint)]">
              Admin
            </p>
          </div>
        )}
      </div>

      <nav
        className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Admin sections"
        aria-expanded={!collapsed}
      >
        {visible.map((item, i) =>
          item.section ? (
            collapsed ? (
              <div
                key={`s-${i}`}
                aria-hidden="true"
                className="mx-2 my-3 border-t border-[var(--color-line)] first:mt-0"
              />
            ) : (
              <p
                key={`s-${i}`}
                className="sidebar-label px-2 pb-1.5 pt-4 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--color-faint)] first:pt-0"
              >
                {item.section}
              </p>
            )
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative mb-0.5 flex items-center gap-2.5 rounded-[var(--radius-md)] py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-2',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span aria-hidden="true" className="sidebar-active-bar" />
                  )}
                  <item.icon
                    size={17}
                    strokeWidth={isActive ? 2.25 : 2}
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)] group-hover:text-[var(--color-ink-soft)]',
                    )}
                  />
                  {!collapsed && <span className="sidebar-label">{item.label}</span>}
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>

      {isSuperadmin && !collapsed && (
        <p className="sidebar-label border-t border-[var(--color-line)] px-5 py-3 text-[0.6875rem] font-medium text-[var(--color-faint)]">
          Signed in as superadmin — full access
        </p>
      )}
    </>
  )
}

function Topbar({ onMenu, collapsed, onToggleCollapse }) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 sm:px-6 lg:px-10">
      <div className="flex items-center gap-1">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="btn-ghost -ml-2 rounded-[var(--radius-md)] p-2 text-[var(--color-ink-soft)] lg:hidden"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="btn-ghost hidden rounded-[var(--radius-md)] p-2 text-[var(--color-ink-soft)] lg:inline-flex"
        >
          {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
        </button>
      </div>

      <div className="hidden lg:block" />

      {/* Utility cluster — theme · settings · administration · account */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <ThemeToggle />
        <SettingsShortcut />
        <AdministrationMenu />
        <span
          className="mx-1 hidden h-5 w-px bg-[var(--color-line)] sm:block"
          aria-hidden="true"
        />
        <AccountMenu />
      </div>
    </header>
  )
}

const iconButton =
  'btn-ghost flex items-center justify-center rounded-[var(--radius-md)] p-2 text-[var(--color-ink-soft)]'

function SettingsShortcut() {
  const { can } = useAuth()
  if (!can('settings.view')) return null
  return (
    <NavLink
      to="/admin/settings"
      end
      title="Settings"
      aria-label="Settings"
      className={({ isActive }) =>
        cn(iconButton, isActive && 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]')
      }
    >
      <Settings size={16} />
    </NavLink>
  )
}

function AdministrationMenu() {
  const { can } = useAuth()
  const items = ADMIN_NAV.filter((i) => can(i.perm))
  if (items.length === 0) return null
  return (
    <Dropdown
      align="end"
      width="w-60"
      button={({ ref, ...p }) => (
        <button
          ref={ref}
          {...p}
          aria-label="Administration"
          className="btn-ghost flex items-center gap-1.5 rounded-[var(--radius-md)] py-2 pl-2 pr-1.5 text-sm text-[var(--color-ink-soft)] data-[open]:bg-[var(--color-surface-hover)] data-[open]:text-[var(--color-ink)]"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden md:inline">Administration</span>
          <ChevronDown size={14} className="text-[var(--color-faint)]" aria-hidden="true" />
        </button>
      )}
    >
      <p className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">
        Administration
      </p>
      {items.map((i) => (
        <DropdownItem key={i.to} to={i.to} end icon={i.icon}>
          {i.label}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const roles = user?.roles ?? []
  const [changingPassword, setChangingPassword] = useState(false)
  return (
    <>
      <Dropdown
        align="end"
        width="w-60"
        button={({ ref, ...p }) => (
          <button
            ref={ref}
            {...p}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-[var(--radius-md)] px-1 py-1 transition-colors hover:bg-[var(--color-surface-hover)] data-[open]:bg-[var(--color-surface-hover)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-xs font-semibold text-[var(--color-ink-soft)]">
              {initials(user?.name)}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm text-[var(--color-ink-soft)] sm:block">
              {user?.name}
            </span>
            <ChevronDown
              size={14}
              className="hidden text-[var(--color-faint)] sm:block"
              aria-hidden="true"
            />
          </button>
        )}
      >
        <div className="border-b border-[var(--color-line)] px-3 py-2.5">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">{user?.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{user?.email}</p>
          {roles.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1">
              {roles.map((r) => (
                <span
                  key={r}
                  className="rounded-[3px] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--color-accent)]"
                >
                  {r}
                </span>
              ))}
            </p>
          )}
        </div>
        <DropdownItem icon={KeyRound} onClick={() => setChangingPassword(true)}>
          Change password
        </DropdownItem>
        <DropdownItem icon={LogOut} onClick={logout}>
          Sign out
        </DropdownItem>
      </Dropdown>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </>
  )
}

/**
 * Self password change for the signed-in staff member — same current/new/
 * confirm shape as the customer account area's password form (see
 * PasswordSection in routes/account/Account.jsx), just against the staff
 * `/auth/password` endpoint. Reachable from the account menu regardless of
 * role — both admin and superadmin can always change their own password.
 */
function ChangePasswordModal({ onClose }) {
  const uid = useId()
  const { changePassword } = useAuth()
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [pending, setPending] = useState(false)
  const [reveal, setReveal] = useState({ current: false, next: false, confirm: false })

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setPending(true)
    setFormError(null)
    try {
      await changePassword(form)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError(err.message || 'Please check the highlighted fields.')
      } else {
        setFormError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  const fields = [
    ['current_password', 'current', 'Current password', 'current-password'],
    ['password', 'next', 'New password', 'new-password'],
    ['password_confirmation', 'confirm', 'Confirm new password', 'new-password'],
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            Update password
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {fields.map(([key, revealKey, label, autoComplete]) => (
          <Field key={key} label={label} required error={fieldErrors[key]} htmlFor={`${uid}-${key}`}>
            <div className="relative">
              <TextInput
                id={`${uid}-${key}`}
                type={reveal[revealKey] ? 'text' : 'password'}
                autoComplete={autoComplete}
                required
                autoFocus={key === 'current_password'}
                style={{ paddingRight: '2.25rem' }}
                value={form[key]}
                onChange={update(key)}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => ({ ...r, [revealKey]: !r[revealKey] }))}
                aria-label={reveal[revealKey] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                aria-pressed={reveal[revealKey]}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
              >
                {reveal[revealKey] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        ))}

        {formError && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}

function ThemeToggle() {
  const { pref, cycle } = useTheme()
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : MonitorIcon
  const label =
    pref === 'light' ? 'Light theme' : pref === 'dark' ? 'Dark theme' : 'System theme'
  return (
    <button
      onClick={cycle}
      title={`${label} — click to change`}
      aria-label={`${label}. Switch theme.`}
      className={iconButton}
    >
      <Icon size={16} />
    </button>
  )
}
