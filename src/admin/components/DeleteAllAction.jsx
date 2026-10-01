import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useMutation } from '../hooks/useMutation'
import { Modal } from './Modal'
import { Button } from './ui'

// The phrase the server's DeleteAllRequest demands. It is only ever sent from
// the confirm button below, so nothing can be wiped without the dialog.
const CONFIRMATION = 'DELETE ALL'

/**
 * Page-level "Delete All" — wipes a whole data domain, not the rows or the
 * page currently on screen. Clicking the button only opens a confirmation
 * dialog; the DELETE is sent solely from that dialog's "Delete All" button,
 * and Cancel / Esc / the backdrop / the close icon all leave the data alone.
 *
 * Renders nothing unless the signed-in user is an admin or superadmin holding
 * every permission in `permissions` — the same rule the server enforces
 * (`role:superadmin|admin` + `permission:` middleware), so hiding the button
 * here is a convenience, never the guard.
 *
 * `endpoint` is the bulk DELETE route, `subject` names what goes ("all
 * appointments"), `children` is the dialog body spelling out exactly what is
 * removed and kept. `onDeleted` fires after a successful delete (refetch).
 */
export function DeleteAllAction({ endpoint, permissions = [], subject, children, onDeleted }) {
  const { can, user, isSuperadmin } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)

  const { mutate, pending } = useMutation(
    () => api.delete(endpoint, { body: { confirm: CONFIRMATION } }),
    {
      onSuccess: (res) => {
        toast.success(res?.message || `Deleted ${subject}.`)
        setConfirming(false)
        onDeleted?.(res)
      },
    },
  )

  const isAdmin = isSuperadmin || (user?.roles ?? []).includes('admin')
  if (!isAdmin || !permissions.every(can)) return null

  // While the request is in flight the dialog can't be dismissed — closing it
  // would hide a deletion that is still running.
  const close = () => {
    if (!pending) setConfirming(false)
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 size={14} /> Delete All
      </Button>

      <Modal
        open={confirming}
        onClose={close}
        size="sm"
        title={`Delete ${subject}?`}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => mutate()} loading={pending}>
              {pending ? 'Deleting…' : 'Delete All'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-[var(--color-ink-soft)]">
          <p className="flex items-start gap-2 font-medium text-[var(--color-danger)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              This is a destructive action. It deletes every record, not only the ones on this
              page or matching the current filters, and it cannot be undone.
            </span>
          </p>
          {children}
        </div>
      </Modal>
    </>
  )
}
