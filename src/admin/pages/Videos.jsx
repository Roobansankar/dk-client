import { useState } from 'react'
import { Eye, EyeOff, Pencil, Trash2, Upload, Video as VideoIcon } from 'lucide-react'
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
  Toggle,
  cn,
} from '../components/ui'
import { VideoInput } from '../components/VideoInput'
import { resolveMediaUrl } from '../../lib/env'

export default function VideosPage() {
  const { can } = useAuth()
  const canManage = can('videos.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/videos', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/videos/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/videos/${id}`), {
    successMessage: 'Video deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (video) => {
      const fd = new FormData()
      fd.append('status', video.status ? '0' : '1')
      return api.putForm(`/admin/videos/${video.id}`, fd)
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
        title="Videos"
        description="Clips shown in the homepage Video section, in this order. Uploads are compressed automatically."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Upload size={15} /> Upload video
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
            icon={VideoIcon}
            title="No videos yet"
            description="Upload studio footage to fill the homepage Video section."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <Upload size={15} /> Upload video
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
          {ordered.map((video, i) => (
            <figure key={video.id} className="card group overflow-hidden">
              <div className="relative aspect-video overflow-hidden bg-[var(--color-surface-sunken)]">
                <video
                  src={resolveMediaUrl(video.video_url)}
                  poster={resolveMediaUrl(video.thumbnail_url)}
                  className={cn('h-full w-full object-cover', !video.status && 'opacity-40 grayscale')}
                  loop
                  playsInline
                  preload="metadata"
                  controls
                />
                {canManage && (
                  <div className="pointer-events-none absolute left-1.5 top-1.5 [&>*]:pointer-events-auto">
                    <ReorderButtons
                      index={i}
                      count={ordered.length}
                      onMove={onMove}
                      disabled={reorderMut.pending}
                    />
                  </div>
                )}
                {!video.status && (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-[3px] bg-[var(--color-neutral-tint)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-neutral)]">
                    Hidden
                  </span>
                )}
              </div>
              <figcaption className="flex items-start justify-between gap-2 p-2.5">
                <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                  {video.title || 'Untitled'}
                </p>
                {canManage && (
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={video.status ? 'Hide video' : 'Show video'}
                        onClick={() => toggleMut.mutate(video)}
                      >
                        {video.status ? <Eye size={13} /> : <EyeOff size={13} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Edit video"
                        onClick={() => setModal({ mode: 'edit', video })}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete video"
                        className="text-[var(--color-danger)]"
                        onClick={() => setDeleteTarget(video)}
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
        <VideoFormModal
          mode={modal.mode}
          video={modal.video}
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
        title="Delete this video?"
        message="The file is permanently removed and disappears from the homepage."
        confirmLabel="Delete video"
      />
    </div>
  )
}

function VideoFormModal({ mode, video, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: video?.title ?? '',
    status: video?.status ?? true,
  })
  const [file, setFile] = useState({ file: null, remove: false })

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('title', form.title ?? '')
      fd.append('status', form.status ? '1' : '0')
      if (file.file) fd.append('video', file.file)
      return mode === 'create'
        ? api.postForm('/admin/videos', fd)
        : api.putForm(`/admin/videos/${video.id}`, fd)
    },
    {
      successMessage:
        mode === 'create'
          ? 'Video uploaded — compressing may take a moment before it appears on the homepage.'
          : 'Video updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Upload video' : 'Edit video'}
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
        <VideoInput
          label={mode === 'create' ? 'Video' : 'Replace video'}
          currentUrl={video?.video_url}
          posterUrl={video?.thumbnail_url}
          error={fieldErrors.video}
          onChange={setFile}
        />
        <Field label="Title" error={fieldErrors.title}>
          <TextInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the homepage</span>
          <Toggle
            id="video-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
