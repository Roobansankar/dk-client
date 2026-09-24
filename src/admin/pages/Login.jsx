import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { Button, Field, TextInput } from '../components/ui'
import { useTheme } from '../lib/theme'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const { resolved, cycle } = useTheme()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await login(form.email.trim(), form.password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err.fieldErrors().email || 'Check your email and password.')
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Wait a minute and try again.')
      } else {
        setError(err.message || 'Could not sign in.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-paper)]">
      <div className="flex justify-end p-4">
        <button
          onClick={cycle}
          aria-label="Switch theme"
          className="btn-ghost rounded-[var(--radius-md)] p-2 text-[var(--color-ink-soft)]"
        >
          {resolved === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-sm font-bold tracking-[0.04em] text-[var(--color-accent)]">
              DK
            </span>
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--color-ink)]">
              DK StyleHub Admin
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Sign in to manage the studio.
            </p>
          </div>

          <form onSubmit={onSubmit} className="card p-6">
            <div className="flex flex-col gap-4">
              <Field label="Email">
                <TextInput
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: '2.25rem' }}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink-soft)] focus-visible:text-[var(--color-ink-soft)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && (
                <p className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-tint)] px-3 py-2 text-sm text-[var(--color-danger)]">
                  {error}
                </p>
              )}

              <Button type="submit" loading={pending} className="mt-1 w-full">
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
