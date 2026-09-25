import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useEditableCopy } from '../hooks/useEditableCopy'
import { DataTable } from '../components/DataTable'
import { Modal, ConfirmDialog } from '../components/Modal'
import { ReorderButtons, move } from '../components/Reorder'
import {
  ActiveBadge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormSection,
  PageHeader,
  SearchInput,
  Select,
  StatGrid,
  Textarea,
  TextInput,
  Toggle,
  Toolbar,
} from '../components/ui'
import { formatPrice } from '../lib/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All plans', test: () => true },
  { value: 'active', label: 'Active on site', test: (p) => Boolean(p.status) },
  { value: 'inactive', label: 'Inactive', test: (p) => !p.status },
]

const VALIDITY_OPTIONS = [
  { value: 'all', label: 'Any validity', test: () => true },
  { value: 'expires', label: 'Expires after a set time', test: (p) => Boolean(p.validity_days) },
  { value: 'never', label: 'Never expires', test: (p) => !p.validity_days },
]

const validityText = (p) => (p.validity_days ? `${p.validity_days} days` : 'No expiry')
const featuresOf = (p) => p.features ?? []

export default function PricingPlansPage() {
  const { can } = useAuth()
  const canManage = can('pricing.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/pricing-plans', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: 'all', validity: 'all' })
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const reorderMut = useMutation((ids) => api.post('/admin/pricing-plans/reorder', { ids }), {
    successMessage: 'Order saved.',
    onSuccess: refetch,
  })
  const deleteMut = useMutation((id) => api.delete(`/admin/pricing-plans/${id}`), {
    successMessage: 'Plan deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (plan) => api.put(`/admin/pricing-plans/${plan.id}`, { status: !plan.status }),
    { onSuccess: refetch },
  )

  function onMove(i, dir) {
    const next = move(ordered, i, dir)
    if (next === ordered) return
    setOrdered(next)
    reorderMut.mutate(next.map((p) => p.id))
  }

  const activeCount = ordered.filter((p) => p.status).length
  const prices = ordered.map((p) => Number(p.price)).filter((n) => !Number.isNaN(n))
  const priceRange =
    prices.length === 0
      ? '—'
      : Math.min(...prices) === Math.max(...prices)
        ? formatPrice(prices[0])
        : `${formatPrice(Math.min(...prices))} – ${formatPrice(Math.max(...prices))}`

  const statusTest = STATUS_OPTIONS.find((o) => o.value === filters.status)?.test ?? (() => true)
  const validityTest =
    VALIDITY_OPTIONS.find((o) => o.value === filters.validity)?.test ?? (() => true)
  const query = filters.search.trim().toLowerCase()

  const shown = ordered.filter(
    (p) =>
      statusTest(p) &&
      validityTest(p) &&
      (!query || (p.name ?? '').toLowerCase().includes(query)),
  )
  const filtered = filters.search !== '' || filters.status !== 'all' || filters.validity !== 'all'
  const clearFilters = () => setFilters({ search: '', status: 'all', validity: 'all' })

  const newButton = canManage && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> New plan
    </Button>
  )

  // Row cells hold their own controls — keep their clicks from also opening the row.
  const stop = (node) => <div onClick={(e) => e.stopPropagation()}>{node}</div>

  const columns = [
    {
      key: 'order',
      header: 'Order',
      cell: (p) => {
        const i = ordered.findIndex((x) => x.id === p.id)
        return stop(
          <div className="flex items-center gap-2">
            <span className="w-4 text-right font-medium tabular-nums text-[var(--color-ink)]">
              {i + 1}
            </span>
            {canManage && (
              <span title={filtered ? 'Clear the filters to change the order' : undefined}>
                <ReorderButtons
                  index={i}
                  count={ordered.length}
                  onMove={onMove}
                  disabled={reorderMut.pending || filtered}
                />
              </span>
            )}
          </div>,
        )
      },
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (p) => (
        <div className="min-w-[11rem]">
          <p className="font-medium text-[var(--color-ink)]">{p.name}</p>
          <p className="max-w-[24rem] truncate text-xs text-[var(--color-muted)]">
            {p.description || 'No description'}
          </p>
          <p className="mt-1 text-sm tabular-nums md:hidden">
            <span className="font-semibold text-[var(--color-ink)]">{formatPrice(p.price)}</span>
            <span className="text-[var(--color-muted)]"> · {validityText(p)}</span>
          </p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      hideBelow: 'md',
      cell: (p) => (
        <span className="whitespace-nowrap font-semibold tabular-nums text-[var(--color-ink)]">
          {formatPrice(p.price)}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Validity',
      hideBelow: 'md',
      cell: (p) => (
        <span className={p.validity_days ? undefined : 'text-[var(--color-muted)]'}>
          {validityText(p)}
        </span>
      ),
    },
    {
      key: 'includes',
      header: 'Includes',
      hideBelow: 'md',
      cell: (p) => {
        const n = featuresOf(p).length
        return n > 0 ? (
          <span className="whitespace-nowrap">
            {n} item{n === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-[var(--color-muted)]">—</span>
        )
      },
    },
    {
      key: 'status',
      header: 'On site',
      cell: (p) =>
        canManage
          ? stop(
              <Toggle
                id={`plan-${p.id}`}
                checked={Boolean(p.status)}
                disabled={toggleMut.pending}
                onChange={() => toggleMut.mutate(p)}
                label={p.status ? 'Active' : 'Inactive'}
              />,
            )
          : <ActiveBadge active={p.status} />,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (p) =>
              stop(
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => setModal({ mode: 'edit', plan: p })}
                  >
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${p.name}`}
                    title="Delete"
                    className="text-[var(--color-danger)]"
                    onClick={() => setDeleteTarget(p)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>,
              ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Pricing Plans"
        description="Packages shown on the public site, in the order set here."
      >
        {newButton}
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="flex flex-col gap-5">
          {!loading && (
            <StatGrid
              size="md"
              columns={3}
              items={[
                {
                  label: 'Plans',
                  value: ordered.length.toLocaleString('en-IN'),
                  hint: `${ordered.length - activeCount} inactive`,
                },
                {
                  label: 'Active on site',
                  value: activeCount.toLocaleString('en-IN'),
                  hint: 'Visible to visitors',
                },
                { label: 'Price range', value: priceRange, hint: 'Lowest to highest plan' },
              ]}
            />
          )}

          <Toolbar className="!mb-0">
            <SearchInput
              wrapperClassName="min-w-[12rem] flex-1"
              placeholder="Search by plan name"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
            />

            <Field label="Status" htmlFor="plans-status" className="w-[calc(50%-0.375rem)] sm:w-48">
              <Select
                id="plans-status"
                value={filters.status}
                onChange={(e) => setFilter({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${ordered.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Validity" htmlFor="plans-validity" className="w-[calc(50%-0.375rem)] sm:w-56">
              <Select
                id="plans-validity"
                value={filters.validity}
                onChange={(e) => setFilter({ validity: e.target.value })}
              >
                {VALIDITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${ordered.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            {filtered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </Toolbar>

          <div className="card">
            <DataTable
              columns={columns}
              rows={shown}
              loading={loading}
              refetching={refetching}
              showSerial={false}
              onRowClick={canManage ? (p) => setModal({ mode: 'edit', plan: p }) : undefined}
              renderExpanded={(p) => <PlanDetails plan={p} />}
              empty={
                <EmptyState
                  icon={Tags}
                  title={ordered.length === 0 ? 'No pricing plans yet' : 'No plans match'}
                  description={
                    ordered.length === 0
                      ? "Add a package with a price, validity and what's included."
                      : 'Try a different search or filter.'
                  }
                  action={ordered.length === 0 ? newButton : undefined}
                />
              }
            />
            {!loading && shown.length > 0 && (
              <p className="border-t border-[var(--color-line)] px-3 py-3 text-xs text-[var(--color-muted)]">
                Showing {shown.length} of {ordered.length} plan{ordered.length === 1 ? '' : 's'}
                {' · use the arrow on a row to see what’s included'}
                {canManage &&
                  (filtered
                    ? ' · clear the filters to change the order'
                    : ' · use the ▲ ▼ buttons to change the order visitors see')}
              </p>
            )}
          </div>
        </div>
      )}

      {modal && (
        <PlanFormModal
          mode={modal.mode}
          plan={modal.plan}
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
        message="The plan will be removed from the public site. To just take it off for now, set it to inactive instead."
        confirmLabel="Delete plan"
      />
    </div>
  )
}

/** What a plan includes — shown when its row is expanded. */
function PlanDetails({ plan }) {
  const features = featuresOf(plan)
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]">
        What’s included
      </p>
      {features.length > 0 ? (
        <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-sm text-[var(--color-ink-soft)] sm:grid-cols-2">
          {features.map((f, idx) => (
            <li key={idx} className="flex gap-2">
              <Check size={14} className="mt-1 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Nothing listed yet. Edit the plan to add what’s included.
        </p>
      )}
      {plan.description && (
        <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-sm text-[var(--color-muted)]">
          {plan.description}
        </p>
      )}
    </div>
  )
}

function PlanFormModal({ mode, plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan?.price ?? '',
    validity_days: plan?.validity_days ?? '',
    status: plan?.status ?? true,
  })
  const [features, setFeatures] = useState(plan?.features?.length ? plan.features : [''])
  // Focus the "included" row that Enter / Add item just created.
  const inputRefs = useRef([])
  const focusNext = useRef(null)
  useEffect(() => {
    if (focusNext.current == null) return
    inputRefs.current[focusNext.current]?.focus()
    focusNext.current = null
  }, [features])

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: form.price === '' ? null : Number(form.price),
        validity_days: form.validity_days === '' ? null : Number(form.validity_days),
        features: features.map((f) => f.trim()).filter(Boolean),
        status: form.status,
      }
      return mode === 'create'
        ? api.post('/admin/pricing-plans', payload)
        : api.put(`/admin/pricing-plans/${plan.id}`, payload)
    },
    {
      successMessage: mode === 'create' ? 'Plan created.' : 'Plan updated.',
      onSuccess: onSaved,
    },
  )

  const addFeatureAfter = (idx) => {
    focusNext.current = idx + 1
    setFeatures((list) => [...list.slice(0, idx + 1), '', ...list.slice(idx + 1)])
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'New pricing plan' : `Edit ${plan.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Create plan' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <FormSection title="Details">
          <Field label="Plan name" htmlFor="plan-name" required error={fieldErrors.name}>
            <TextInput
              id="plan-name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Description" htmlFor="plan-description" error={fieldErrors.description}>
            <Textarea
              id="plan-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </FormSection>

        <FormSection title="Price & validity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)" htmlFor="plan-price" required error={fieldErrors.price}>
              <TextInput
                id="plan-price"
                type="number"
                min="0"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </Field>
            <Field
              label="Validity (days)"
              htmlFor="plan-validity"
              hint="Leave blank if it doesn't expire"
              error={fieldErrors.validity_days}
            >
              <TextInput
                id="plan-validity"
                type="number"
                min="1"
                inputMode="numeric"
                value={form.validity_days}
                onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="What’s included"
          hint="One benefit per line. Press Enter to add the next one."
        >
          <div className="flex flex-col gap-2">
            {features.map((feat, idx) => (
              <div key={idx} className="flex gap-2">
                <TextInput
                  value={feat}
                  aria-label={`Included item ${idx + 1}`}
                  placeholder={`Item ${idx + 1}`}
                  ref={(el) => {
                    inputRefs.current[idx] = el
                  }}
                  onChange={(e) =>
                    setFeatures((list) =>
                      list.map((v, i) => (i === idx ? e.target.value : v)),
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFeatureAfter(idx)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove item ${idx + 1}`}
                  onClick={() =>
                    setFeatures((list) =>
                      list.length === 1 ? [''] : list.filter((_, i) => i !== idx),
                    )
                  }
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
            {fieldErrors.features && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {fieldErrors.features}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => addFeatureAfter(features.length - 1)}
            >
              <Plus size={13} /> Add item
            </Button>
          </div>
        </FormSection>

        <FormSection title="Visibility">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
            <Toggle
              id="plan-status"
              checked={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
          </div>
        </FormSection>
      </form>
    </Modal>
  )
}
