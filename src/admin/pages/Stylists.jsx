import { useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useEditableCopy } from '../hooks/useEditableCopy'
import { Modal, ConfirmDialog } from '../components/Modal'
import { ReorderButtons, move } from '../components/Reorder'
import {
  ActiveBadge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'

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

  return (
    <div>
      <PageHeader
        title="Stylists"
        description="Team members shown in the public booking form and the “Meet the team” section, in this order."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Plus size={15} /> New stylist
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <LoadingBlock label="Loading stylists…" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={UserRound}
            title="No stylists yet"
            description="Add the people who work in the studio so clients can request them when booking."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <Plus size={15} /> New stylist
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className={cn('flex flex-col gap-2', refetching && 'opacity-70')}>
          {ordered.map((s, i) => (
            <li key={s.id} className="card flex items-center gap-3 p-3">
              {canManage && (
                <ReorderButtons
                  index={i}
                  count={ordered.length}
                  onMove={onMove}
                  disabled={reorderMut.pending}
                />
              )}
              <Thumb
                src={s.image_url}
                alt=""
                iconSize={15}
                className="h-11 w-11 shrink-0 rounded-full border border-[var(--color-line)]"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate font-medium text-[var(--color-ink)]">{s.name}</span>
                  {!s.status && <ActiveBadge active={false} />}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {s.bio || 'No bio'}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={s.status ? 'Deactivate stylist' : 'Activate stylist'}
                    onClick={() => toggleMut.mutate(s)}
                  >
                    {s.status ? <Eye size={14} /> : <EyeOff size={14} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Edit stylist"
                    onClick={() => setModal({ mode: 'edit', stylist: s })}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete stylist"
                    className="text-[var(--color-danger)]"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
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
            ? `This stylist is on ${deleteTarget.appointments_count} appointment(s). Deactivate them instead to keep that history intact.`
            : 'They will be removed from the public site.'
        }
        confirmLabel="Delete stylist"
      />
    </div>
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
          label="Short bio"
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
