import { useState } from 'react'
import { Eye, EyeOff, MessageSquareQuote, Pencil, Star, Trash2 } from 'lucide-react'
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
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'

export default function ReviewsPage() {
  const { can } = useAuth()
  const canManage = can('reviews.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/reviews', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/reviews/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/reviews/${id}`), {
    successMessage: 'Review deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (review) => {
      const fd = new FormData()
      fd.append('is_published', review.is_published ? '0' : '1')
      return api.putForm(`/admin/reviews/${review.id}`, fd)
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
        title="Reviews"
        description="Google reviews added here manually, plus reviews customers submit from the site — both wait for you to publish them. There is no automatic sync with Google."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <MessageSquareQuote size={15} /> Add review
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
            icon={MessageSquareQuote}
            title="No reviews yet"
            description="Add a client's Google review to publish it on the homepage."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <MessageSquareQuote size={15} /> Add review
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className={cn('flex flex-col gap-3', refetching && 'opacity-70')}>
          {ordered.map((review, i) => (
            <li
              key={review.id}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="flex shrink-0 items-center gap-3">
                {canManage && (
                  <ReorderButtons
                    index={i}
                    count={ordered.length}
                    onMove={onMove}
                    disabled={reorderMut.pending}
                  />
                )}
                <Thumb
                  src={review.reviewer_avatar_url}
                  alt=""
                  className={cn(
                    'h-11 w-11 shrink-0 rounded-full',
                    !review.is_published && 'opacity-40 grayscale',
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--color-ink)]">{review.reviewer_name}</p>
                  <span className="flex items-center gap-0.5 text-[var(--color-warning,#c9a227)]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={13}
                        fill={idx < review.rating ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                      />
                    ))}
                  </span>
                  {review.review_date && (
                    <span className="text-xs text-[var(--color-faint)]">{review.review_date}</span>
                  )}
                  {!review.is_published && (
                    <span className="rounded-[3px] bg-[var(--color-neutral-tint)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-neutral)]">
                      Unpublished
                    </span>
                  )}
                  {review.source === 'customer' && (
                    <span className="rounded-[3px] bg-[var(--color-accent-tint,var(--color-neutral-tint))] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-ink-soft)]">
                      Customer submitted
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-ink-soft)]">
                  {review.review_text}
                </p>
              </div>

              {canManage && (
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={review.is_published ? 'Unpublish review' : 'Publish review'}
                    onClick={() => toggleMut.mutate(review)}
                  >
                    {review.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Edit review"
                    onClick={() => setModal({ mode: 'edit', review })}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete review"
                    className="text-[var(--color-danger)]"
                    onClick={() => setDeleteTarget(review)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <ReviewFormModal
          mode={modal.mode}
          review={modal.review}
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
        title="Delete this review?"
        message="This permanently removes the review and it disappears from the public homepage."
        confirmLabel="Delete review"
      />
    </div>
  )
}

function ReviewFormModal({ mode, review, onClose, onSaved }) {
  const [form, setForm] = useState({
    reviewer_name: review?.reviewer_name ?? '',
    rating: review?.rating ?? 5,
    review_text: review?.review_text ?? '',
    review_date: review?.review_date ?? '',
    is_published: review?.is_published ?? true,
  })
  const [file, setFile] = useState({ file: null, remove: false })

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('reviewer_name', form.reviewer_name ?? '')
      fd.append('rating', String(form.rating))
      fd.append('review_text', form.review_text ?? '')
      if (form.review_date) fd.append('review_date', form.review_date)
      fd.append('is_published', form.is_published ? '1' : '0')
      if (file.file) fd.append('avatar', file.file)
      return mode === 'create'
        ? api.postForm('/admin/reviews', fd)
        : api.putForm(`/admin/reviews/${review.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Review added.' : 'Review updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Add review' : 'Edit review'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Add review' : 'Save changes'}
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
        <ImageInput
          label="Reviewer photo (optional)"
          currentUrl={review?.reviewer_avatar_url}
          error={fieldErrors.avatar}
          onChange={setFile}
        />
        <Field label="Reviewer name" error={fieldErrors.reviewer_name} required>
          <TextInput
            value={form.reviewer_name}
            onChange={(e) => setForm((f) => ({ ...f, reviewer_name: e.target.value }))}
            required
          />
        </Field>
        <Field label="Rating" error={fieldErrors.rating} required>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={form.rating === n}
                onClick={() => setForm((f) => ({ ...f, rating: n }))}
                className="text-[var(--color-warning,#c9a227)]"
              >
                <Star size={22} fill={n <= form.rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Review text" error={fieldErrors.review_text} required>
          <Textarea
            value={form.review_text}
            onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
            required
          />
        </Field>
        <Field
          label="Review date"
          hint="As shown on Google — optional"
          error={fieldErrors.review_date}
        >
          <TextInput
            type="date"
            value={form.review_date}
            onChange={(e) => setForm((f) => ({ ...f, review_date: e.target.value }))}
          />
        </Field>
        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="review-published"
            checked={form.is_published}
            onChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
