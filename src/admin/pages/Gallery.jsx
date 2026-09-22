import { useState } from 'react'
import { Eye, EyeOff, Images, Pencil, Trash2, Upload } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useEditableCopy } from '../hooks/useEditableCopy'
import { Modal, ConfirmDialog } from '../components/Modal'
import { ReorderButtons, move } from '../components/Reorder'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'

export default function GalleryPage() {
  const { can } = useAuth()
  const canManage = can('gallery.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/gallery', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/gallery/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/gallery/${id}`), {
    successMessage: 'Image deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (img) => {
      const fd = new FormData()
      fd.append('status', img.status ? '0' : '1')
      return api.putForm(`/admin/gallery/${img.id}`, fd)
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
        title="Gallery"
        description="Photos shown on the public gallery page, in this order."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Upload size={15} /> Upload image
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Images}
            title="No images yet"
            description="Upload studio photography to fill the public gallery."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <Upload size={15} /> Upload image
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
            refetching && 'opacity-70',
          )}
        >
          {ordered.map((img, i) => (
            <figure key={img.id} className="card group overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-sunken)]">
                <Thumb
                  src={img.image_url}
                  alt={img.alt_text || ''}
                  className={cn(
                    'h-full w-full',
                    !img.status && 'opacity-40 grayscale',
                  )}
                />
                {canManage && (
                  <div className="absolute left-1.5 top-1.5">
                    <ReorderButtons
                      index={i}
                      count={ordered.length}
                      onMove={onMove}
                      disabled={reorderMut.pending}
                    />
                  </div>
                )}
                {!img.status && (
                  <span className="absolute right-1.5 top-1.5 rounded-[3px] bg-[var(--color-neutral-tint)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-neutral)]">
                    Hidden
                  </span>
                )}
              </div>
              <figcaption className="flex items-start justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {img.title || 'Untitled'}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {img.alt_text || 'No alt text'}
                    {img.category ? ` · ${img.category}` : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={img.status ? 'Hide image' : 'Show image'}
                        onClick={() => toggleMut.mutate(img)}
                      >
                        {img.status ? <Eye size={13} /> : <EyeOff size={13} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Edit image"
                        onClick={() => setModal({ mode: 'edit', image: img })}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete image"
                        className="text-[var(--color-danger)]"
                        onClick={() => setDeleteTarget(img)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {modal && (
        <ImageFormModal
          mode={modal.mode}
          image={modal.image}
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
        title="Delete this image?"
        message="The file is permanently removed and disappears from the public gallery."
        confirmLabel="Delete image"
      />
    </div>
  )
}

function ImageFormModal({ mode, image, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: image?.title ?? '',
    alt_text: image?.alt_text ?? '',
    category: image?.category ?? '',
    status: image?.status ?? true,
  })
  const [file, setFile] = useState({ file: null, remove: false })

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('title', form.title ?? '')
      fd.append('alt_text', form.alt_text ?? '')
      fd.append('category', form.category ?? '')
      fd.append('status', form.status ? '1' : '0')
      if (file.file) fd.append('image', file.file)
      return mode === 'create'
        ? api.postForm('/admin/gallery', fd)
        : api.putForm(`/admin/gallery/${image.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Image uploaded.' : 'Image updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Upload image' : 'Edit image'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutate()}
            loading={pending}
            disabled={mode === 'create' && !file.file}
          >
            {mode === 'create' ? 'Upload' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (mode === 'create' && !file.file) return
          mutate()
        }}
      >
        <ImageInput
          label={mode === 'create' ? 'Image' : 'Replace image'}
          currentUrl={image?.image_url}
          error={fieldErrors.image}
          onChange={setFile}
        />
        <Field label="Title" error={fieldErrors.title}>
          <TextInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field
          label="Alt text"
          hint="Describes the image for screen readers and search"
          error={fieldErrors.alt_text}
        >
          <TextInput
            value={form.alt_text}
            onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
          />
        </Field>
        <Field label="Category" hint="Optional grouping, e.g. interior, work" error={fieldErrors.category}>
          <TextInput
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
        </Field>
        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="img-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
