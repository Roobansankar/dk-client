import { useEffect, useRef, useState } from 'react'
import { Download, User } from 'lucide-react'
import { api } from '../lib/api'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useToast } from '../lib/toast'
import { Modal, ConfirmDialog } from './Modal'
import { DeleteAppointmentAction } from './DeleteAppointmentAction'
import {
  Button,
  ErrorState,
  Field,
  PaymentBadge,
  Select,
  SourceBadge,
  StatusBadge,
  Textarea,
} from './ui'
import { formatDate, formatDateTime, formatDuration, formatPrice, formatTime } from '../lib/format'

const NEXT_ACTIONS = {
  // `pending` is not offered as a status choice anywhere in the admin UI, but a
  // request that arrived from the public site still needs a way to be confirmed.
  pending: [['confirmed', 'Confirm', false]],
  confirmed: [
    ['completed', 'Mark completed', false],
    ['cancelled', 'Cancel', true],
  ],
  completed: [],
  cancelled: [['confirmed', 'Reopen', false]],
}

const PAYMENT_OPTIONS = [
  ['unpaid', 'Unpaid'],
  ['advance_paid', 'Advance paid'],
  ['paid', 'Paid in full'],
]
const PAYMENT_METHOD_LABELS = { upi: 'UPI', cash: 'Cash', card: 'Card' }
// Offline: how the customer paid at the salon. Online: the advance is the
// Razorpay payment; this records how the remaining balance was paid.
const methodFieldFor = (source) =>
  source === 'offline' ? 'payment_method' : 'balance_payment_method'

const labelGender = (g) =>
  ({ male: 'Male', female: 'Female', unisex: 'Not specified' })[g] ?? g

/**
 * Shared appointment detail dialog — used by both the operational Appointments
 * list and the Appointment History view. `canManage` gates every write.
 */
export function AppointmentDetail({ id, canManage, onClose, onChanged }) {
  const { data: appt, loading, error, refetch } = useQuery(`/admin/appointments/${id}`, {
    // If another tab/admin deletes this appointment while the panel is open,
    // re-pull it when the admin returns to the tab — a 404 then triggers the
    // graceful cleanup below. Event-driven, mirrors the list. Not polling.
    revalidateOnFocus: true,
  })
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind, value, label }

  // The appointment was deleted — here, in another tab, or by another admin —
  // so the detail fetch (or a "Try again") 404s. Never surface Laravel's raw
  // "No query results for model…" text: drop the stale selection, close this
  // panel and revalidate the list, with one clean toast. Guarded so a repeated
  // 404 can only clean up once.
  const missing = error?.status === 404
  const cleanedUp = useRef(false)
  useEffect(() => {
    if (!missing || cleanedUp.current) return
    cleanedUp.current = true
    toast.info('Appointment no longer exists. The list has been refreshed.')
    onChanged?.()
    onClose()
  }, [missing, onChanged, onClose, toast])

  const afterWrite = () => {
    refetch()
    onChanged?.()
  }

  const statusMut = useMutation(
    (status) => api.patch(`/admin/appointments/${id}`, { status }),
    { successMessage: 'Status updated.', onSuccess: afterWrite },
  )
  // Confirming a pending appointment runs the server-side slot lock: it checks
  // the stylist's day for an overlapping confirmed appointment and rejects
  // (422) with a clear message if the full service duration can't be reserved.
  const confirmMut = useMutation(
    () => api.post(`/admin/appointments/${id}/confirm`),
    {
      successMessage: 'Appointment confirmed — the time slot is now blocked.',
      onSuccess: afterWrite,
    },
  )
  const paymentMut = useMutation(
    (payment_status) => api.patch(`/admin/appointments/${id}`, { payment_status }),
    { successMessage: 'Payment status updated.', onSuccess: afterWrite },
  )
  const methodMut = useMutation(
    (method) =>
      api.patch(`/admin/appointments/${id}`, { [methodFieldFor(appt?.source)]: method || null }),
    { successMessage: 'Payment method updated.', onSuccess: afterWrite },
  )
  const notesMut = useMutation(() => api.patch(`/admin/appointments/${id}`, { notes }), {
    successMessage: 'Notes saved.',
    onSuccess: () => {
      setNotesDirty(false)
      refetch()
    },
  })
  // Bill / invoice PDF for this appointment — offered once it is paid in
  // full (the PDF itself stamps PAID IN FULL). Same record the dialog shows.
  const billMut = useMutation(
    () =>
      api.download(
        `/admin/appointments/${id}/bill`,
        {},
        `bill-${appt?.reference || id}.pdf`,
      ),
    { successMessage: 'Bill downloaded.' },
  )

  const currentNotes = notesDirty ? notes : (appt?.notes ?? '')
  const actions = appt ? (NEXT_ACTIONS[appt.status] ?? []) : []

  const runAction = ([value, label, destructive]) => {
    if (value === 'confirmed' && appt?.status === 'pending') {
      confirmMut.mutate()
      return
    }
    if (destructive) setConfirm({ kind: 'status', value, label })
    else statusMut.mutate(value)
  }

  const slotError =
    confirmMut.fieldErrors?.appointment_time || confirmMut.fieldErrors?.status || null

  const changePayment = (value) => {
    if (value === appt.payment_status) return
    setConfirm({
      kind: 'payment',
      value,
      label: PAYMENT_OPTIONS.find(([v]) => v === value)?.[1],
    })
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={appt ? appt.customer_name : 'Appointment'}
        description={appt ? `Reference ${appt.reference}` : undefined}
        size="lg"
        footer={
          canManage && appt && !missing ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button
                    key={a[0]}
                    size="sm"
                    variant={a[2] ? 'danger' : 'primary'}
                    loading={statusMut.pending || confirmMut.pending}
                    onClick={() => runAction(a)}
                  >
                    {a[1]}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <DeleteAppointmentAction
                  appointment={appt}
                  variant="button"
                  onDeleted={() => {
                    onChanged?.()
                    onClose()
                  }}
                />
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        {loading || missing ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={appt.status} />
              <PaymentBadge status={appt.payment_status} />
              <SourceBadge source={appt.source} />
              <span className="text-xs text-[var(--color-faint)]">
                {appt.source === 'offline' ? 'Created' : 'Requested'}{' '}
                {formatDateTime(appt.created_at)}
              </span>
            </div>

            {/* The stylist the customer chose — surfaced right under the status
                row, ahead of the generic details grid, so staff see who to
                brief/assign before anything else (phone, service, timing…). */}
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-3.5 py-2.5">
              <User size={18} className="shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="label mb-0.5">Stylist</p>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {appt.stylist_name || 'Any available'}
                </p>
              </div>
            </div>

            {slotError && (
              <p
                role="alert"
                className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-tint)] px-3 py-2 text-sm text-[var(--color-danger)]"
              >
                {slotError}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Detail label="Phone" value={appt.phone} />
              <Detail label="Gender" value={labelGender(appt.gender)} />
              <Detail label="Category" value={appt.category_name || '—'} />
              <Detail label="Service" value={appt.service_name || '—'} />
              <Detail label="Date" value={formatDate(appt.appointment_date)} />
              <Detail
                label="Time"
                value={
                  appt.appointment_end_time
                    ? `${formatTime(appt.appointment_time)} – ${formatTime(appt.appointment_end_time)}`
                    : formatTime(appt.appointment_time)
                }
              />
              <Detail label="Duration" value={formatDuration(appt.duration_minutes)} />
            </dl>

            {/* Payment / advance breakdown */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
              <p className="label mb-2">Payment</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <Detail label="Service price" value={formatPrice(appt.service_price)} />
                <Detail
                  label="Advance"
                  value={
                    appt.advance_percentage
                      ? `${formatPrice(appt.advance_amount)} · ${appt.advance_percentage}%`
                      : '—'
                  }
                />
                <Detail label="Received" value={formatPrice(appt.amount_received)} />
                <Detail label="Remaining" value={formatPrice(appt.remaining_amount)} />
                {appt.source === 'offline' ? (
                  <Detail
                    label="Payment method"
                    value={PAYMENT_METHOD_LABELS[appt.payment_method] || '—'}
                  />
                ) : (
                  <Detail
                    label="Balance paid via"
                    value={PAYMENT_METHOD_LABELS[appt.balance_payment_method] || 'Not recorded'}
                  />
                )}
              </dl>
              {appt.payment_status === 'paid' && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={billMut.pending}
                    onClick={() => billMut.mutate()}
                  >
                    <Download size={15} /> Download Bill (PDF)
                  </Button>
                </div>
              )}
              {canManage && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="label mb-0" htmlFor="pay-status">
                    Mark as
                  </label>
                  <Select
                    id="pay-status"
                    className="h-8 w-44 py-0 text-xs"
                    value={appt.payment_status}
                    disabled={paymentMut.pending}
                    onChange={(e) => changePayment(e.target.value)}
                  >
                    {PAYMENT_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                  <label className="label mb-0" htmlFor="pay-method">
                    {appt.source === 'offline' ? 'Paid via' : 'Balance paid via'}
                  </label>
                  <Select
                    id="pay-method"
                    className="h-8 w-36 py-0 text-xs"
                    value={appt[methodFieldFor(appt.source)] ?? ''}
                    disabled={methodMut.pending}
                    onChange={(e) => methodMut.mutate(e.target.value)}
                  >
                    <option value="">Not recorded</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {appt.message && (
              <div>
                <p className="label">Customer message</p>
                <p className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-ink-soft)]">
                  {appt.message}
                </p>
              </div>
            )}

            <Field
              label="Internal notes"
              hint={canManage ? 'Only staff can see this.' : 'Read only for your role.'}
            >
              <Textarea
                rows={3}
                disabled={!canManage}
                value={currentNotes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setNotesDirty(true)
                }}
              />
            </Field>
            {canManage && notesDirty && (
              <div className="-mt-2">
                <Button size="sm" loading={notesMut.pending} onClick={() => notesMut.mutate()}>
                  Save notes
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        pending={statusMut.pending || paymentMut.pending}
        destructive={confirm?.kind === 'status'}
        title={
          confirm?.kind === 'payment'
            ? `Set payment to “${confirm?.label}”?`
            : `${confirm?.label} this appointment?`
        }
        message={
          confirm?.kind === 'payment'
            ? confirm.value === 'paid' && !['cancelled', 'rejected'].includes(appt.status)
              ? 'This records the bill as settled in full and sends the customer a WhatsApp payment receipt with the bill PDF.'
              : 'This updates the recorded payment for accounting.'
            : 'The customer-facing status will change. This can be reopened later.'
        }
        confirmLabel={confirm?.label ?? 'Confirm'}
        onConfirm={() => {
          if (confirm.kind === 'payment') paymentMut.mutate(confirm.value)
          else statusMut.mutate(confirm.value)
          setConfirm(null)
        }}
      />
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className="text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}
