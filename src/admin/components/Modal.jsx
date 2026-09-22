import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button, cn } from './ui'

/**
 * Accessible dialog: focus trap-ish (initial focus + Esc + backdrop click),
 * body scroll lock, restores focus on close. Used only where a task needs
 * protected focus (create/edit forms, destructive confirms).
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    restoreRef.current = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const focusable = ref.current?.querySelector(
        'input,select,textarea,button,[tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      clearTimeout(t)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center overflow-y-auto bg-[rgb(17_17_16_/_0.55)] p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'card w-full overflow-hidden rounded-b-none border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-pop)] sm:rounded-b-[var(--radius-lg)]',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-xl',
          size === 'lg' && 'sm:max-w-3xl',
        )}
        style={{ animation: 'modal-in 200ms var(--ease-standard)' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-ghost -mr-2 -mt-1 rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    // Portal within .admin-app, not document.body — the admin design tokens
    // (--color-*, etc.) are scoped there so they coexist with the public
    // site's identically-named tokens in the same bundle (see admin.css).
    document.querySelector('.admin-app') || document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  destructive = true,
  pending,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--color-ink-soft)]">{message}</p>
    </Modal>
  )
}
