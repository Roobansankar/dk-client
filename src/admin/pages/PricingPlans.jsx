import { useState } from 'react'
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
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
  Toggle,
} from '../components/ui'
import { formatPrice } from '../lib/format'

export default function PricingPlansPage() {
  const { can } = useAuth()
  const canManage = can('pricing.manage')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/pricing-plans', {
    params: { per_page: 100 },
  })

  const [ordered, setOrdered] = useEditableCopy(data)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  return (
    <div>
      <PageHeader
        title="Pricing Plans"
        description="Packages shown on the public site. Order here is the order visitors see."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Plus size={15} /> New plan
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
            icon={Tags}
            title="No pricing plans yet"
            description="Add a package with a price, validity and what's included."
            action={
              canManage && (
                <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
                  <Plus size={15} /> New plan
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className={refetching ? 'opacity-70' : undefined}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ordered.map((plan, i) => (
              <article key={plan.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{plan.name}</h3>
                    <p className="mt-0.5 text-sm tabular-nums text-[var(--color-ink-soft)]">
                      {formatPrice(plan.price)}
                      {plan.validity_days ? (
                        <span className="text-[var(--color-muted)]">
                          {' '}
                          · {plan.validity_days} days
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {canManage && (
                    <ReorderButtons
                      index={i}
                      count={ordered.length}
                      onMove={onMove}
                      disabled={reorderMut.pending}
                    />
                  )}
                </div>

                {plan.description && (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{plan.description}</p>
                )}

                {plan.features?.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-[var(--color-ink-soft)]">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex gap-2">
                        <Check
                          size={14}
                          className="mt-1 shrink-0 text-[var(--color-accent)]"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-[var(--color-line)] pt-3">
                  {canManage ? (
                    <Toggle
                      id={`plan-${plan.id}`}
                      checked={plan.status}
                      onChange={() => toggleMut.mutate(plan)}
                      label={plan.status ? 'Active' : 'Inactive'}
                    />
                  ) : (
                    <ActiveBadge active={plan.status} />
                  )}
                  {canManage && (
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Edit plan"
                        onClick={() => setModal({ mode: 'edit', plan })}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete plan"
                        className="text-[var(--color-danger)]"
                        onClick={() => setDeleteTarget(plan)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
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
        message="The plan will be removed from the public site."
        confirmLabel="Delete plan"
      />
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
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <Field label="Plan name" required error={fieldErrors.name}>
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
          <Field label="Price (₹)" required error={fieldErrors.price}>
            <TextInput
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
          <Field
            label="Validity (days)"
            hint="Leave blank if it doesn't expire"
            error={fieldErrors.validity_days}
          >
            <TextInput
              type="number"
              min="1"
              value={form.validity_days}
              onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="What's included" error={fieldErrors.features}>
          <div className="flex flex-col gap-2">
            {features.map((feat, idx) => (
              <div key={idx} className="flex gap-2">
                <TextInput
                  value={feat}
                  placeholder={`Item ${idx + 1}`}
                  onChange={(e) =>
                    setFeatures((list) =>
                      list.map((v, i) => (i === idx ? e.target.value : v)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove item"
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setFeatures((list) => [...list, ''])}
            >
              <Plus size={13} /> Add item
            </Button>
          </div>
        </Field>

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="plan-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
