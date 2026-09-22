import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  Scissors,
  Trash2,
} from 'lucide-react'
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
  ChipButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Select,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'
import { formatDuration, formatPrice } from '../lib/format'

export default function ServicesPage() {
  const { gender } = useParams()
  const { can } = useAuth()

  if (gender !== 'male' && gender !== 'female') {
    return <Navigate to="/admin/services/female" replace />
  }

  return <ServicesByGender key={gender} gender={gender} can={can} />
}

function ServicesByGender({ gender, can }) {
  const canCreate = can('services.create')
  const canUpdate = can('services.update')
  const canDelete = can('services.delete')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/service-categories', {
    params: { gender, per_page: 100 },
    deps: [gender],
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [expanded, setExpanded] = useState(null)
  const [categoryModal, setCategoryModal] = useState(null) // {mode, category?}
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/service-categories/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/service-categories/${id}`), {
    successMessage: 'Category deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })

  function onMove(index, dir) {
    const next = move(ordered, index, dir)
    if (next === ordered) return
    setOrdered(next)
    reorderMut.mutate(next.map((c) => c.id))
  }

  const title = gender === 'male' ? 'Male Services' : 'Female Services'

  return (
    <div>
      <PageHeader
        title={title}
        description="Categories and the services inside them. Changes go live on the public site."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCategoryModal({ mode: 'create' })}>
            <FolderPlus size={15} /> New category
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <LoadingBlock label="Loading catalogue…" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Scissors}
            title={`No ${gender} categories yet`}
            description="Create a category like Hair or Skin, then add services to it."
            action={
              canCreate && (
                <Button size="sm" onClick={() => setCategoryModal({ mode: 'create' })}>
                  <FolderPlus size={15} /> New category
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-3', refetching && 'opacity-70')}>
          {ordered.map((category, i) => (
            <CategoryPanel
              key={category.id}
              category={category}
              index={i}
              count={ordered.length}
              expanded={expanded === category.id}
              onToggle={() =>
                setExpanded((e) => (e === category.id ? null : category.id))
              }
              onMove={canUpdate ? onMove : null}
              onEdit={
                canUpdate ? () => setCategoryModal({ mode: 'edit', category }) : null
              }
              onDelete={canDelete ? () => setDeleteTarget(category) : null}
              can={can}
            />
          ))}
        </div>
      )}

      {categoryModal && (
        <CategoryFormModal
          gender={gender}
          mode={categoryModal.mode}
          category={categoryModal.category}
          onClose={() => setCategoryModal(null)}
          onSaved={() => {
            setCategoryModal(null)
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
          deleteTarget?.services_count > 0
            ? `This category has ${deleteTarget.services_count} service(s). Move or delete them first, or set the category inactive instead.`
            : 'This category will be removed from the public site.'
        }
        confirmLabel="Delete category"
      />
    </div>
  )
}

function CategoryPanel({
  category,
  index,
  count,
  expanded,
  onToggle,
  onMove,
  onEdit,
  onDelete,
  can,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        {onMove && (
          <ReorderButtons index={index} count={count} onMove={onMove} />
        )}
        <Thumb
          src={category.image_url}
          alt=""
          iconSize={15}
          className="h-11 w-11 shrink-0 rounded-[var(--radius-md)] border border-[var(--color-line)]"
        />

        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <ChevronRight
            size={16}
            className={cn(
              'shrink-0 text-[var(--color-faint)] transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-[var(--color-ink)]">
                {category.name}
              </span>
              {!category.status && <ActiveBadge active={false} />}
            </span>
            <span className="block truncate text-xs text-[var(--color-muted)]">
              {category.services_count} service{category.services_count === 1 ? '' : 's'}
              {category.description ? ` · ${category.description}` : ''}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit category">
              <Pencil size={14} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Delete category"
              className="text-[var(--color-danger)]"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
          <ServiceList categoryId={category.id} can={can} />
        </div>
      )}
    </section>
  )
}

function ServiceList({ categoryId, can }) {
  const canCreate = can('services.create')
  const canUpdate = can('services.update')
  const canDelete = can('services.delete')

  const { data, loading, error, refetch } = useQuery('/admin/services', {
    params: { category_id: categoryId, per_page: 100 },
    deps: [categoryId],
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const reorderMut = useMutation((ids) => api.post('/admin/services/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/services/${id}`), {
    successMessage: 'Service removed.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })

  function onMove(i, dir) {
    const next = move(ordered, i, dir)
    if (next === ordered) return
    setOrdered(next)
    reorderMut.mutate(next.map((s) => s.id))
  }

  if (loading) return <LoadingBlock label="Loading services…" className="py-8" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      {ordered.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--color-faint)]">
          No services in this category yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {ordered.map((service, i) => (
            <li key={service.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {canUpdate && (
                <ReorderButtons index={i} count={ordered.length} onMove={onMove} />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate font-medium text-[var(--color-ink)]">
                    {service.name}
                  </span>
                  {!service.status && <ActiveBadge active={false} />}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {service.advance_percentage > 0
                    ? `${service.advance_percentage}% advance · ${formatPrice(service.advance_amount)}`
                    : 'No advance'}
                  {service.description ? ` · ${service.description}` : ''}
                </p>
              </div>
              <span className="hidden w-20 shrink-0 text-right text-xs text-[var(--color-muted)] sm:block">
                {formatDuration(service.duration_minutes)}
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums text-[var(--color-ink-soft)]">
                {formatPrice(service.price)}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Edit service"
                    onClick={() => setModal({ mode: 'edit', service })}
                  >
                    <Pencil size={13} />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete service"
                    className="text-[var(--color-danger)]"
                    onClick={() => setDeleteTarget(service)}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canCreate && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setModal({ mode: 'create' })}
        >
          <Plus size={14} /> Add service
        </Button>
      )}

      {modal && (
        <ServiceFormModal
          mode={modal.mode}
          service={modal.service}
          categoryId={categoryId}
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
        title={`Remove “${deleteTarget?.name}”?`}
        message="It will be hidden from the public site. Existing appointment history keeps the service name."
        confirmLabel="Remove service"
      />
    </div>
  )
}

/* -- Category form ---------------------------------------------------- */
function CategoryFormModal({ gender, mode, category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
    category_type: category?.category_type ?? '',
    status: category?.status ?? true,
  })
  const [image, setImage] = useState({ file: null, remove: false })

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('gender', gender)
      fd.append('name', form.name)
      fd.append('description', form.description ?? '')
      fd.append('category_type', form.category_type ?? '')
      fd.append('status', form.status ? '1' : '0')
      if (image.file) fd.append('image', image.file)
      if (image.remove) fd.append('remove_image', '1')
      return mode === 'create'
        ? api.postForm('/admin/service-categories', fd)
        : api.putForm(`/admin/service-categories/${category.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Category created.' : 'Category updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? `New ${gender} category` : `Edit ${category.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Create category' : 'Save changes'}
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
        <Field label="Category name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Hair, Skin, Colour"
          />
        </Field>
        <Field label="Description" error={fieldErrors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Shown on the public services page"
          />
        </Field>
        <Field
          label="Type"
          hint="Drives the public Hair / Skin filter on the services page"
          error={fieldErrors.category_type}
        >
          <Select
            value={form.category_type}
            onChange={(e) => setForm((f) => ({ ...f, category_type: e.target.value }))}
          >
            <option value="">Not set</option>
            <option value="hair">Hair</option>
            <option value="skin">Skin</option>
          </Select>
        </Field>
        <ImageInput
          label="Category image"
          currentUrl={category?.image_url}
          error={fieldErrors.image}
          onChange={setImage}
        />
        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="cat-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}

/* -- Service form ---------------------------------------------------- */
const DURATION_PRESETS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180]

function ServiceFormModal({ mode, service, categoryId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: service?.name ?? '',
    description: service?.description ?? '',
    duration_minutes: service?.duration_minutes ?? '',
    price: service?.price ?? '',
    advance_percentage: service?.advance_percentage ?? 0,
    status: service?.status ?? true,
  })

  const priceNum = form.price === '' ? 0 : Number(form.price)
  const pctNum = form.advance_percentage === '' ? 0 : Number(form.advance_percentage)
  const advanceAmount = Math.round(priceNum * pctNum) / 100
  const remaining = Math.max(0, priceNum - advanceAmount)

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const payload = {
        service_category_id: categoryId,
        name: form.name,
        description: form.description || null,
        duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
        price: form.price === '' ? null : Number(form.price),
        advance_percentage: pctNum,
        status: form.status,
      }
      return mode === 'create'
        ? api.post('/admin/services', payload)
        : api.put(`/admin/services/${service.id}`, payload)
    },
    {
      successMessage: mode === 'create' ? 'Service added.' : 'Service updated.',
      onSuccess: onSaved,
    },
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Add service' : `Edit ${service.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Add service' : 'Save changes'}
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
        <Field label="Service name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="Description" error={fieldErrors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Duration (minutes)"
            hint="How long the service takes"
            error={fieldErrors.duration_minutes}
          >
            <TextInput
              type="number"
              min="1"
              max="1440"
              list="duration-presets"
              placeholder="e.g. 45"
              value={form.duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            />
            <datalist id="duration-presets">
              {DURATION_PRESETS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label="Price (₹)" error={fieldErrors.price}>
            <TextInput
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Advance payment (%)"
          hint="Portion of the price taken to confirm a booking · 0–100"
          error={fieldErrors.advance_percentage}
        >
          <div className="flex items-center gap-3">
            <TextInput
              type="number"
              min="0"
              max="100"
              step="1"
              className="w-28"
              value={form.advance_percentage}
              onChange={(e) => setForm((f) => ({ ...f, advance_percentage: e.target.value }))}
            />
            <div className="flex flex-wrap gap-1.5">
              {[0, 10, 25, 50].map((p) => (
                <ChipButton
                  key={p}
                  active={pctNum === p}
                  onClick={() => setForm((f) => ({ ...f, advance_percentage: p }))}
                >
                  {p}%
                </ChipButton>
              ))}
            </div>
          </div>
          {priceNum > 0 && pctNum > 0 && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Advance <span className="text-[var(--color-ink)]">{formatPrice(advanceAmount)}</span>{' '}
              · remaining <span className="text-[var(--color-ink)]">{formatPrice(remaining)}</span>{' '}
              of {formatPrice(priceNum)}
            </p>
          )}
        </Field>

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Bookable on the public site</span>
          <Toggle
            id="svc-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
