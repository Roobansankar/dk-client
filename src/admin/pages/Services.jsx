import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  IndianRupee,
  Info,
  Layers,
  ListPlus,
  Pencil,
  Plus,
  Scissors,
  SearchX,
  Sparkles,
  Trash2,
  Users,
  Wallet,
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
  Pill,
  SearchInput,
  Select,
  StatGrid,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  Toolbar,
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

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive
  const [expandedIds, setExpandedIds] = useState(() => new Set())
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
    // index here is the index inside `ordered` (we resolve it from the id)
    const next = move(ordered, index, dir)
    if (next === ordered) return
    setOrdered(next)
    reorderMut.mutate(next.map((c) => c.id))
  }

  const stats = useMemo(() => {
    const cats = ordered ?? []
    const totalServices = cats.reduce((n, c) => n + (Number(c.services_count) || 0), 0)
    const visible = cats.filter((c) => c.status).length
    return [
      { label: 'Categories', value: cats.length, hint: gender === 'male' ? 'Men’s menu' : 'Women’s menu' },
      { label: 'Total services', value: totalServices, hint: 'Across all categories' },
      { label: 'Visible', value: visible, hint: 'Live on website' },
      { label: 'Hidden', value: cats.length - visible, hint: 'Draft / paused' },
    ]
  }, [ordered, gender])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (ordered ?? []).filter((c) => {
      if (statusFilter === 'active' && !c.status) return false
      if (statusFilter === 'inactive' && c.status) return false
      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category_type?.toLowerCase().includes(q)
      )
    })
  }, [ordered, search, statusFilter])

  const isSearching = search.trim() !== '' || statusFilter !== 'all'
  // While searching, show everything expanded so staff can see matches instantly.
  const visibleExpanded = (id) => (isSearching ? true : expandedIds.has(id))

  function toggleOne(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const expandAll = () => setExpandedIds(new Set((ordered ?? []).map((c) => c.id)))
  const collapseAll = () => setExpandedIds(new Set())

  const title = gender === 'male' ? "Men's Services" : "Women's Services"
  const isMale = gender === 'male'

  return (
    <div>
      <PageHeader
        title={title}
        description={
          isMale
            ? "Men's menu only — every category and service here appears for MEN customers only. Nothing from the Women's menu shows here, and nothing here leaks there."
            : "Women's menu only — every category and service here appears for WOMEN customers only. Nothing from the Men's menu shows here, and nothing here leaks there."
        }
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCategoryModal({ mode: 'create' })}>
            <FolderPlus size={15} /> New {isMale ? "men's" : "women's"} category
          </Button>
        )}
      </PageHeader>

      {/* Gender scope badge — makes it impossible to mistake which menu you're editing */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill tone={isMale ? 'info' : 'warn'}>
          {isMale ? '♂ MEN ONLY — male customers' : '♀ WOMEN ONLY — female customers'}
        </Pill>
        <span className="text-xs text-[var(--color-muted)]">
          {isMale
            ? 'Beard, men’s haircut, men’s facial… only men’s items live here.'
            : 'Women’s haircut, makeup, saree draping… only women’s items live here.'}
        </span>
      </div>

      {!loading && !error && ordered.length > 0 && (
        <StatGrid items={stats} columns={4} size="md" className="mb-5" />
      )}

      {/* 2. Plain-language how-it-works strip */}
      <div className="card mb-5 flex flex-col gap-2.5 p-4 text-sm sm:flex-row sm:items-center sm:gap-5">
        <p className="flex items-center gap-2 font-medium text-[var(--color-ink)]">
          <Sparkles size={15} className="shrink-0 text-[var(--color-accent)]" />
          How this page works
        </p>
        <ol className="flex flex-1 flex-col gap-1.5 text-[var(--color-muted)] sm:flex-row sm:items-center sm:gap-2">
          <li className="flex items-center gap-1.5">
            <StepNum n="1" /> Create a <strong className="font-medium text-[var(--color-ink)]">category</strong>
          </li>
          <li aria-hidden className="hidden text-[var(--color-faint)] sm:block">→</li>
          <li className="flex items-center gap-1.5">
            <StepNum n="2" /> Add <strong className="font-medium text-[var(--color-ink)]">services</strong> with price &amp; time
          </li>
          <li aria-hidden className="hidden text-[var(--color-faint)] sm:block">→</li>
          <li className="flex items-center gap-1.5">
            <StepNum n="3" /> They go <strong className="font-medium text-[var(--color-ink)]">live</strong> on the website
          </li>
        </ol>
      </div>

      {!loading && !error && ordered.length > 0 && (
        <Toolbar>
          <SearchInput
            label="Search categories"
            placeholder="Type to find — e.g. hair, beard…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="min-w-[11rem] flex-1"
          />
          <Field label="Visibility">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All</option>
              <option value="active">Visible only</option>
              <option value="inactive">Hidden only</option>
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse
            </Button>
          </div>
        </Toolbar>
      )}

      {loading ? (
        <LoadingBlock label="Loading catalogue…" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Scissors}
            title={`No ${gender === 'male' ? "men's" : "women's"} categories yet`}
            description="Start with a category like Hair or Skin — then add the bookable services inside it."
            action={
              canCreate && (
                <Button size="sm" onClick={() => setCategoryModal({ mode: 'create' })}>
                  <FolderPlus size={15} /> Create first category
                </Button>
              )
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing matches “${search}”${statusFilter !== 'all' ? ` with visibility “${statusFilter}”` : ''}. Try a different search.`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Clear search
              </Button>
            }
          />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-4', refetching && 'opacity-70')}>
          {filtered.map((category) => {
            const realIndex = ordered.findIndex((c) => c.id === category.id)
            return (
              <CategoryCard
                key={category.id}
                category={category}
                index={realIndex}
                count={ordered.length}
                gender={gender}
                expanded={visibleExpanded(category.id)}
                forceExpanded={isSearching}
                onToggle={() => toggleOne(category.id)}
                onMove={canUpdate ? onMove : null}
                onEdit={canUpdate ? () => setCategoryModal({ mode: 'edit', category }) : null}
                onDelete={canDelete ? () => setDeleteTarget(category) : null}
                onServicesChanged={refetch}
                can={can}
              />
            )
          })}
          {isSearching && (
            <p className="text-center text-xs text-[var(--color-faint)]">
              Showing {filtered.length} of {ordered.length} categories · all expanded for review
            </p>
          )}
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
            ? `This category has ${deleteTarget.services_count} service(s). Delete or move those services first — or hide the category instead of deleting it.`
            : 'This category will be removed from the website. You can recreate it later.'
        }
        confirmLabel="Delete category"
      />
    </div>
  )
}

function StepNum({ n }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[0.6875rem] font-bold text-[var(--color-accent)]">
      {n}
    </span>
  )
}

/** Serial-number badge — shows the website display order (1, 2, 3…). */
function SerialBadge({ n, title = 'Display order on website' }) {
  return (
    <span
      title={`${title}: ${n}`}
      aria-label={`Serial number ${n}`}
      className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)] px-1.5 text-xs font-bold tabular-nums text-[var(--color-ink-soft)]"
    >
      {String(n).padStart(2, '0')}
    </span>
  )
}

/** Identifying icon for a category based on its website filter type. */
function CategoryTypeIcon({ type }) {
  const Icon = type === 'hair' ? Scissors : type === 'skin' ? Sparkles : FolderOpen
  const label = type === 'hair' ? 'Hair category' : type === 'skin' ? 'Skin category' : 'General category'
  return (
    <span
      title={label}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    >
      <Icon size={14} />
    </span>
  )
}

function CategoryCard({
  category,
  index,
  count,
  gender,
  expanded,
  forceExpanded,
  onToggle,
  onMove,
  onEdit,
  onDelete,
  onServicesChanged,
  can,
}) {
  return (
    <section className="card overflow-hidden" aria-label={`S.No ${index + 1}: ${category.name}`}>
      {/* Header row */}
      <div className="flex items-start gap-3 p-4 sm:items-center">
        <div className="flex flex-col items-center gap-1.5 pt-0.5 sm:pt-0">
          <SerialBadge n={index + 1} />
          {onMove && (
            <div title="Change display order on the website">
              <ReorderButtons index={index} count={count} onMove={onMove} />
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <Thumb
            src={category.image_url}
            alt=""
            iconSize={16}
            className="h-12 w-12 rounded-[var(--radius-md)] border border-[var(--color-line)]"
          />
          <span className="absolute -bottom-1.5 -right-1.5">
            <CategoryTypeIcon type={category.category_type} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--color-faint)]">
            S.No {index + 1}
            {category.category_type ? ` · ${category.category_type}` : ' · general'}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="truncate text-[0.9375rem] font-semibold text-[var(--color-ink)]">
              {category.name}
            </h2>
            <ActiveBadge active={!!category.status} />
            {category.category_type && (
              <Pill tone="info" className="capitalize">
                {category.category_type}
              </Pill>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1 font-medium text-[var(--color-ink-soft)]">
              <Layers size={12} />
              {category.services_count} service{category.services_count === 1 ? '' : 's'}
            </span>
            {category.status ? (
              <span className="inline-flex items-center gap-1">
                <Eye size={12} /> Visible on website
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <EyeOff size={12} /> Hidden from website
              </span>
            )}
          </p>
          {category.description && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{category.description}</p>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={`Delete ${category.name}`}
              title={`Delete ${category.name}`}
              className="text-[var(--color-danger)]"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Action bar — one obvious row: view services / add / edit / delete */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
        <Button
          variant={expanded ? 'outline' : 'primary'}
          size="sm"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-[11rem] justify-between"
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers size={14} />
            {expanded ? 'Hide services' : `View services (${category.services_count})`}
          </span>
          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        </Button>
        {can('services.create') && (
          <AddServiceButton categoryId={category.id} gender={gender} onSaved={onServicesChanged} />
        )}
        <span className="flex-1" />
        {/* Mobile edit/delete live here so they are never icon-only mysteries */}
        <div className="flex items-center gap-2 sm:hidden">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-[var(--color-danger)]">
              <Trash2 size={13} /> Delete
            </Button>
          )}
        </div>
        {!forceExpanded && (
          <span className="hidden text-[0.6875rem] text-[var(--color-faint)] lg:block">
            Tip: use ↑ ↓ to reorder · hidden categories stay off the website
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-line)] p-4">
          <ServiceList categoryId={category.id} categoryName={category.name} gender={gender} can={can} />
        </div>
      )}
    </section>
  )
}

/** Quick-add from the category action bar — refreshes counts after save. */
function AddServiceButton({ categoryId, gender, onSaved }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add {gender === 'male' ? "men's" : "women's"} service
      </Button>
      {open && (
        <ServiceFormModal
          mode="create"
          service={null}
          categoryId={categoryId}
          gender={gender}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            onSaved?.()
            window.dispatchEvent(new CustomEvent('services:changed', { detail: categoryId }))
          }}
        />
      )}
    </>
  )
}

function ServiceList({ categoryId, categoryName, gender, can }) {
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

  // Refresh when the action-bar "Add service" button saves while this list is collapsed.
  useEffect(() => {
    const handler = (e) => {
      if (e.detail === categoryId) refetch()
    }
    window.addEventListener('services:changed', handler)
    return () => window.removeEventListener('services:changed', handler)
  }, [categoryId, refetch])

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

  if (loading) return <LoadingBlock label={`Loading services in ${categoryName}…`} className="py-8" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-faint)]">
        <ListPlus size={13} />
        Services in {categoryName} · {ordered.length}
      </p>

      {ordered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">No services in {categoryName} yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--color-muted)]">
            Add the first bookable item — give it a clear name, price and how long it takes.
          </p>
          {canCreate && (
            <Button size="sm" className="mt-3" onClick={() => setModal({ mode: 'create' })}>
              <Plus size={14} /> Add first service
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-1.5 hidden grid-cols-[2.5rem_1fr_auto] gap-3 px-3 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--color-faint)] sm:grid">
            <span>S.No</span>
            <span>Service</span>
            <span className="text-right">Actions</span>
          </p>
          <ul className="flex flex-col gap-2">
          {ordered.map((service, i) => (
            <li
              key={service.id}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <SerialBadge n={i + 1} title="Service order inside category" />
              {canUpdate && (
                <ReorderButtons index={i} count={ordered.length} onMove={onMove} />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--color-ink)]">{service.name}</span>
                  {!service.status && <ActiveBadge active={false} />}
                  {service.advance_percentage > 0 && (
                    <Pill tone="warn">{service.advance_percentage}% advance</Pill>
                  )}
                </p>
                {service.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">
                    {service.description}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs italic text-[var(--color-faint)]">No description</p>
                )}
                {/* Price / time / advance — always visible, no guessing */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                    <IndianRupee size={12} /> {formatPrice(service.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
                    <Clock size={12} /> {formatDuration(service.duration_minutes)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
                    <Wallet size={12} />
                    {service.advance_percentage > 0
                      ? `Advance ${formatPrice(service.advance_amount)} · pay later ${formatPrice((Number(service.price) || 0) - (Number(service.advance_amount) || 0))}`
                      : 'Pay at studio'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 border-t border-[var(--color-line)] pt-2 sm:border-0 sm:pt-0">
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModal({ mode: 'edit', service })}
                  >
                    <Pencil size={13} /> Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--color-danger)]"
                    onClick={() => setDeleteTarget(service)}
                  >
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        </>
      )}

      {canCreate && ordered.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full justify-center border-dashed sm:w-auto"
          onClick={() => setModal({ mode: 'create' })}
        >
          <Plus size={14} /> Add another service to {categoryName}
        </Button>
      )}

      {modal && (
        <ServiceFormModal
          mode={modal.mode}
          service={modal.service}
          categoryId={categoryId}
          categoryName={categoryName}
          gender={gender}
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
        message="It will disappear from the website immediately. Past appointment records keep the service name."
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

  const genderLabel = gender === 'male' ? "Men's" : "Women's"

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? `New ${genderLabel.toLowerCase()} category` : `Edit “${category.name}”`}
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
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-2.5 text-xs text-[var(--color-muted)]">
          <Info size={14} className="mt-0.5 shrink-0" />
          Saving to the <strong className="font-semibold text-[var(--color-ink)]">{gender === 'male' ? "Men's" : "Women's"} menu only</strong>
          <span aria-hidden>·</span> visible to {gender === 'male' ? 'MEN' : 'WOMEN'} customers only. A category is a section (e.g. {gender === 'male' ? 'Hair, Beard, Skin' : 'Hair, Skin, Makeup'}).
        </p>
        <Field label="Category name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={gender === 'male' ? 'e.g. Hair, Beard, Skin' : 'e.g. Hair, Skin, Makeup'}
          />
        </Field>
        <Field label="Short description" hint="Shown under the category name on the website" error={fieldErrors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Cuts, styling and treatments for all hair types"
          />
        </Field>
        <Field
          label="Website filter"
          hint="Lets customers filter Hair vs Skin on the services page"
          error={fieldErrors.category_type}
        >
          <Select
            value={form.category_type}
            onChange={(e) => setForm((f) => ({ ...f, category_type: e.target.value }))}
          >
            <option value="">Not set — shows under “All”</option>
            <option value="hair">Hair — shows under Hair filter</option>
            <option value="skin">Skin — shows under Skin filter</option>
          </Select>
        </Field>
        <ImageInput
          label="Category photo (optional)"
          currentUrl={category?.image_url}
          error={fieldErrors.image}
          onChange={setImage}
        />
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
          <span className="text-sm">
            <span className="block font-medium text-[var(--color-ink)]">Visible on website</span>
            <span className="block text-xs text-[var(--color-muted)]">Turn off to hide without deleting</span>
          </span>
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

function ServiceFormModal({ mode, service, categoryId, categoryName, gender, onClose, onSaved }) {
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
      title={mode === 'create' ? `Add service${categoryName ? ` to ${categoryName}` : ''}` : `Edit “${service.name}”`}
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
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-2.5 text-xs text-[var(--color-muted)]">
          <Users size={14} className="mt-0.5 shrink-0" />
          {gender === 'male' ? "Men's service" : gender === 'female' ? "Women's service" : 'Service'}
          {categoryName ? ` in “${categoryName}”` : ''} — bookable by {gender === 'male' ? 'MEN' : gender === 'female' ? 'WOMEN' : 'customers'} only. Give a clear name, time and price.
        </p>
        <Field label="Service name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={gender === 'male' ? 'e.g. Classic Haircut, Beard Trim, Head Massage' : 'e.g. Classic Haircut, Facial, Occasion Makeup'}
          />
        </Field>
        <Field label="Description (optional)" hint="One line customers read before booking" error={fieldErrors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Includes wash, cut and basic styling"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Time needed (minutes)"
            hint="Slot length for booking"
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
          <Field label="Price (₹)" hint="Full amount customer pays" error={fieldErrors.price}>
            <TextInput
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 499"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Advance to confirm booking (%)"
          hint="0 = pay fully at studio · 100 = pay fully online"
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
              Customer pays <span className="font-medium text-[var(--color-ink)]">{formatPrice(advanceAmount)}</span> online
              {' '}· <span className="font-medium text-[var(--color-ink)]">{formatPrice(remaining)}</span> at studio
              {' '}of {formatPrice(priceNum)}
            </p>
          )}
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
          <span className="text-sm">
            <span className="block font-medium text-[var(--color-ink)]">Bookable on website</span>
            <span className="block text-xs text-[var(--color-muted)]">Turn off to pause bookings without deleting</span>
          </span>
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
