import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)
let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message, { type = 'info', duration = 4500 } = {}) => {
      const id = ++seq
      setToasts((t) => [...t, { id, message, type }])
      if (duration) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const toast = {
    success: (m, o) => push(m, { ...o, type: 'success' }),
    error: (m, o) => push(m, { ...o, type: 'error', duration: 7000 }),
    info: (m, o) => push(m, { ...o, type: 'info' }),
  }

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}
const TONE = {
  success: 'text-[var(--color-ok)]',
  error: 'text-[var(--color-danger)]',
  info: 'text-[var(--color-info)]',
}

function ToastCard({ toast, onClose }) {
  const Icon = ICONS[toast.type]
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] px-3.5 py-3 text-[var(--color-ink)] shadow-[var(--shadow-pop)]"
      style={{ animation: 'toast-in 220ms var(--ease-standard)' }}
    >
      <Icon size={17} className={`mt-0.5 shrink-0 ${TONE[toast.type]}`} />
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="btn-ghost -m-1 shrink-0 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
