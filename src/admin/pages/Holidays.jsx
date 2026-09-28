import { useState } from 'react'
import { CalendarOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { Modal, ConfirmDialog } from '../components/Modal'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Pill,
  TextInput,
} from '../components/ui'
import { parseDateIso, studioNow } from '../../lib/time'

const fullDate = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Admin → Studio → Holidays: studio-wide closed days (e.g. Diwali). One entry
 * closes the whole studio for every professional on that date — no one can be
 * booked, whatever their own hours say. Unlike a stylist's own day off (set on
 * their Services & hours calendar), this needs entering only once.
 */
export default function HolidaysPage() {
  const { can } = useAuth()
  const canManage = can('stylists.manage')
  const todayIso = studioNow().dateIso

  const { data, loading, error, refetch, refetching } = useQuery('/admin/studio-holidays')

  const [modal, setModal] = useState(null) // { mode: 'create' } | { mode: 'edit', holiday }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteMut = useMutation((id) => api.delete(`/admin/studio-holidays/${id}`), {
    successMessage: 'Holiday removed — that date is bookable again.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })

  const holidays = Array.isArray(data) ? data : []
  const upcoming = holidays.filter((h) => h.date >= todayIso)
  const past = holidays.filter((h) => h.date < todayIso)

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Studio-wide closed days — one entry closes the whole studio for every professional on that date. For one stylist's own day off, use their Services & hours calendar instead."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Plus size={15} /> Add holiday
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : holidays.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarOff}
            title="No holidays set"
            description="Add a festival or studio closed day — no professional can be booked on it."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <Plus size={15} /> Add holiday
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className={refetching ? 'opacity-70' : undefined}>
          <HolidayList
            title="Upcoming closed days"
            holidays={upcoming}
            emptyText="No upcoming holidays — every date follows the usual schedules."
            canManage={canManage}
            onEdit={(holiday) => setModal({ mode: 'edit', holiday })}
            onDelete={setDeleteTarget}
          />
          {past.length > 0 && (
            <div className="mt-6">
              <HolidayList
                title="Past holidays"
                holidays={past}
                canManage={canManage}
                onEdit={(holiday) => setModal({ mode: 'edit', holiday })}
                onDelete={setDeleteTarget}
              />
            </div>
          )}
        </div>
      )}

      {modal && (
        <HolidayModal
          key={modal.mode === 'edit' ? modal.holiday.id : 'create'}
          modal={modal}
          todayIso={todayIso}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            refetch()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        pending={deleteMut.pending}
        title="Remove this holiday?"
        message={
          deleteTarget
            ? `${deleteTarget.name} (${fullDate.format(parseDateIso(deleteTarget.date))}) will become bookable again for every professional.`
            : ''
        }
        confirmLabel="Remove holiday"
      />
    </div>
  )
}

function HolidayList({ title, holidays, emptyText, canManage, onEdit, onDelete }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
        {title} <span className="ml-1 font-normal tabular-nums text-[var(--color-muted)]">{holidays.length}</span>
      </h2>
      {holidays.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
          {emptyText ?? 'Nothing here.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {holidays.map((holiday) => (
            <li
              key={holiday.id}
              className="card flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] text-[var(--color-muted)]">
                <CalendarOff size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{holiday.name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {fullDate.format(parseDateIso(holiday.date))}
                </p>
              </div>
              {holiday.date < studioNow().dateIso && <Pill tone="neutral">Past</Pill>}
              {canManage && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="sm" aria-label={`Rename ${holiday.name}`} onClick={() => onEdit(holiday)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${holiday.name}`}
                    onClick={() => onDelete(holiday)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HolidayModal({ modal, todayIso, onClose, onSaved }) {
  const editing = modal.mode === 'edit'
  const [form, setForm] = useState(() =>
    editing ? { date: modal.holiday.date, name: modal.holiday.name } : { date: '', name: '' },
  )

  const saveMut = useMutation(
    () =>
      editing
        ? api.put(`/admin/studio-holidays/${modal.holiday.id}`, form)
        : api.post('/admin/studio-holidays', form),
    {
      successMessage: editing ? 'Holiday updated.' : 'Holiday added — the studio is closed that date.',
      onSuccess: onSaved,
    },
  )

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const invalid =
    !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
    form.date < todayIso ||
    form.name.trim() === ''

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Rename holiday' : 'Add a holiday'}
      description="One date the whole studio stays closed — every professional, all services."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saveMut.pending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            loading={saveMut.pending}
            disabled={invalid}
          >
            {editing ? 'Save changes' : 'Add holiday'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Date" required error={saveMut.fieldErrors.date} hint="Today or later.">
          <TextInput
            type="date"
            min={todayIso}
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </Field>
        <Field label="Name" required error={saveMut.fieldErrors.name} hint="Shown on the booking page, e.g. Diwali.">
          <TextInput
            type="text"
            maxLength={100}
            placeholder="Diwali"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  )
}
