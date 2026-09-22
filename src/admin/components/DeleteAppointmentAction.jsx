import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useMutation } from '../hooks/useMutation'
import { ConfirmDialog } from './Modal'
import { Button } from './ui'

/**
 * Delete an appointment, gated behind a confirmation dialog so a single click
 * can never remove a record. Server route: DELETE /api/admin/appointments/:id
 * (permission: appointments.manage).
 *
 * `variant="icon"` — a compact trash button for a table row (stops row-click
 * propagation). `variant="button"` — a labelled button for the detail dialog.
 * `onDeleted` fires after a successful delete (refetch the list, close a modal).
 * API errors surface as a toast via useMutation; the dialog stays open to retry.
 */
export function DeleteAppointmentAction({ appointment, onDeleted, variant = 'icon' }) {
  const [confirming, setConfirming] = useState(false)

  const { mutate, pending } = useMutation(
    () => api.delete(`/admin/appointments/${appointment.id}`),
    {
      successMessage: 'Appointment deleted.',
      onSuccess: () => {
        setConfirming(false)
        onDeleted?.(appointment)
      },
    },
  )

  // A 404 means the appointment is already gone (another tab/admin removed it
  // first) — the goal is met, so treat it like a success: close the dialog and
  // let the parent drop it from the list / selection. useMutation still shows
  // its clean "no longer exists" toast; no raw Laravel error reaches the UI.
  const run = async () => {
    const res = await mutate()
    if (!res.ok && res.error?.status === 404) {
      setConfirming(false)
      onDeleted?.(appointment)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--color-danger)]"
          aria-label={`Delete appointment for ${appointment.customer_name}`}
          onClick={(e) => {
            e.stopPropagation()
            setConfirming(true)
          }}
        >
          <Trash2 size={14} />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--color-danger)]"
          loading={pending}
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={14} /> Delete
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={run}
        pending={pending}
        destructive
        title={`Delete appointment for ${appointment.customer_name}?`}
        message={`Reference ${appointment.reference}. This permanently removes the appointment and its history — it can't be undone.`}
        confirmLabel="Delete appointment"
      />
    </>
  )
}
