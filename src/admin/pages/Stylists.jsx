import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Info,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useEditableCopy } from '../hooks/useEditableCopy'
import { Modal, ConfirmDialog } from '../components/Modal'
import { move } from '../components/Reorder'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Pill,
  Skeleton,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'

// The homepage "Meet the team" section shows the first four visible stylists
// (MeetTheTeam.jsx); the booking page lists every visible one that has services
// and working hours set up (see the "Services & hours" page).
const HOMEPAGE_SLOTS = 4

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

export default function StylistsPage() {
  const { can } = useAuth()
  const canManage = can('stylists.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/stylists', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)
  const [modal, setModal] = useState(null) // { mode, stylist? }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/stylists/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/stylists/${id}`), {
    successMessage: 'Stylist deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (s) => {
      const fd = new FormData()
      fd.append('status', s.status ? '0' : '1')
      return api.putForm(`/admin/stylists/${s.id}`, fd)
    },
    { onSuccess: refetch },
  )

  function onMove(i, dir) {
    const next = move(ordered, i, dir)
    if (next === ordered) return
    setOrdered(next)
    reorderMut.mutate(next.map((x) => x.id))
  }

  async function toggleVisible(s) {
    setOrdered((list) => list.map((x) => (x.id === s.id ? { ...x, status: !x.status } : x)))
    const res = await toggleMut.mutate(s)
    if (!res.ok) refetch() // put the switch back to what the server has
  }

  const visible = ordered.filter((s) => s.status)
  const homepageIds = new Set(visible.slice(0, HOMEPAGE_SLOTS).map((s) => s.id))
  const hiddenCount = ordered.length - visible.length

  const newButton = canManage && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> New stylist
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Stylists"
        description="The people clients see on the website and can pick when booking."
      >
        {newButton}
      </PageHeader>

      {loading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading stylists">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-square" />
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={UserRound}
            title="No stylists yet"
            description="Add the people who work in the studio so clients can request them when booking."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="card mb-5 flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-ink-soft)]">
              <span>
                <strong className="font-semibold text-[var(--color-ink)]">{ordered.length}</strong>{' '}
                {ordered.length === 1 ? 'stylist' : 'stylists'}
              </span>
              <Pill tone="ok">{visible.length} visible</Pill>
              {hiddenCount > 0 && <Pill tone="neutral">{hiddenCount} hidden</Pill>}
            </div>
            <p className="flex items-start gap-2 text-xs text-[var(--color-muted)] sm:max-w-md">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              <span>
                {canManage && 'Use the arrows to change the order. '}
                The first {HOMEPAGE_SLOTS} visible stylists appear on the homepage. Clients can book
                a visible stylist once you set their services and working hours.
              </span>
            </p>
          </div>

          <ul className={cn(GRID, refetching && 'opacity-70')}>
            {ordered.map((s, i) => (
              <StylistCard
                key={s.id}
                stylist={s}
                index={i}
                count={ordered.length}
                onHomepage={homepageIds.has(s.id)}
                canManage={canManage}
                busy={reorderMut.pending}
                toggling={toggleMut.pending}
                onMove={onMove}
                onToggle={() => toggleVisible(s)}
                onEdit={() => setModal({ mode: 'edit', stylist: s })}
                onDelete={() => setDeleteTarget(s)}
              />
            ))}
          </ul>
        </>
      )}

      {modal && (
        <StylistFormModal
          mode={modal.mode}
          stylist={modal.stylist}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            refetch()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        pending={deleteMut.pending}
        title={`Delete “${deleteTarget?.name}”?`}
        message={
          deleteTarget?.appointments_count > 0
            ? `This stylist is on ${deleteTarget.appointments_count} appointment(s). Hide them instead to keep that history intact.`
            : 'They will be removed from the public site.'
        }
        confirmLabel="Delete stylist"
      />
    </div>
  )
}

function StylistCard({
  stylist: s,
  index,
  count,
  onHomepage,
  canManage,
  busy,
  toggling,
  onMove,
  onToggle,
  onEdit,
  onDelete,
}) {
  const visible = Boolean(s.status)
  const services = s.services_count ?? 0
  // Bookable = has services AND hours set on at least one upcoming calendar date.
  const upcomingDays = s.upcoming_days_count ?? 0
  const setupReady = services > 0 && upcomingDays > 0

  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-sunken)] sm:aspect-square">
        {s.image_url ? (
          <Thumb
            src={s.image_url}
            alt={s.name}
            iconSize={26}
            className={cn('h-full w-full', !visible && 'opacity-40 grayscale')}
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn('flex h-full w-full items-center justify-center', !visible && 'opacity-50')}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-3xl font-semibold text-[var(--color-muted)]">
              {s.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        {canManage ? (
          <div className="absolute left-2.5 top-2.5 inline-flex items-center overflow-hidden rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] shadow-sm">
            <OrderButton
              label={`Move ${s.name} earlier`}
              disabled={busy || index === 0}
              onClick={() => onMove(index, -1)}
            >
              <ArrowLeft size={14} />
            </OrderButton>
            <span
              className="min-w-6 px-1 text-center text-xs font-semibold tabular-nums text-[var(--color-ink)]"
              title={`Position ${index + 1} of ${count}`}
            >
              {index + 1}
            </span>
            <OrderButton
              label={`Move ${s.name} later`}
              disabled={busy || index === count - 1}
              onClick={() => onMove(index, 1)}
            >
              <ArrowRight size={14} />
            </OrderButton>
          </div>
        ) : (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--color-ink)] shadow-sm">
            {index + 1}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">{s.name}</h2>
        <div className="flex flex-wrap gap-1.5">
          {!visible ? (
            <Pill tone="neutral">Hidden from site</Pill>
          ) : onHomepage ? (
            <Pill tone="ok">On homepage</Pill>
          ) : (
            <Pill tone="info">Visible</Pill>
          )}
          {visible && !setupReady && <Pill tone="warn">Not bookable yet</Pill>}
        </div>
        <p
          className={cn(
            'line-clamp-2 text-sm leading-relaxed',
            s.bio ? 'text-[var(--color-ink-soft)]' : 'italic text-[var(--color-faint)]',
          )}
        >
          {s.bio || 'No bio added yet'}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <p className="text-xs text-[var(--color-muted)]">
            {setupReady
              ? `${services} service${services === 1 ? '' : 's'} · available on ${upcomingDays} upcoming day${upcomingDays === 1 ? '' : 's'}`
              : services === 0
                ? 'No services ticked yet'
                : 'No dates set on the calendar yet'}
          </p>
          <Link
            to={`/admin/stylists/${s.id}/setup`}
            className="btn btn-outline btn-sm w-full justify-center no-underline"
          >
            <CalendarClock size={14} /> Services &amp; hours
          </Link>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <Toggle
            id={`stylist-visible-${s.id}`}
            checked={visible}
            disabled={toggling}
            onChange={onToggle}
            label={visible ? 'Visible' : 'Hidden'}
          />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${s.name}`}
              title="Delete"
              className="text-[var(--color-danger)]"
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function OrderButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function StylistFormModal({ mode, stylist, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: stylist?.name ?? '',
    bio: stylist?.bio ?? '',
    status: stylist?.status ?? true,
  })
  const [image, setImage] = useState({ file: null, remove: false })

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('bio', form.bio ?? '')
      fd.append('status', form.status ? '1' : '0')
      if (image.file) fd.append('image', image.file)
      if (image.remove) fd.append('remove_image', '1')
      return mode === 'create'
        ? api.postForm('/admin/stylists', fd)
        : api.putForm(`/admin/stylists/${stylist.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Stylist added.' : 'Stylist updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'New stylist' : `Edit ${stylist.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Add stylist' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <Field label="Name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field
          label="Role"
          hint="Shown under the name on the public site"
          error={fieldErrors.bio}
        >
          <Textarea
            rows={2}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </Field>
        <ImageInput
          label="Profile image"
          currentUrl={stylist?.image_url}
          error={fieldErrors.image}
          onChange={setImage}
        />
        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="stylist-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
