import { useState } from 'react'
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { Modal, ConfirmDialog } from '../components/Modal'
import {
  ActiveBadge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Pill,
  Select,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'
import { formatMoney as money } from '../lib/format'
import { withTax } from '../../lib/pricing'

/**
 * Admin → Combos (/api/admin/combos).
 *
 * A combo contains existing products with individual combo-specific prices.
 * Customers may select any non-empty subset:
 *
 * - Proper subset → sum of selected combo prices.
 * - Complete set → configured bundle price, when present.
 *
 * The combo's tax % is added on top of either amount at checkout.
 */
export default function CombosPage() {
  const { can } = useAuth()

  const { data, loading, error, refetch, refetching } = useQuery('/admin/combos', {
    params: { per_page: 100 },
  })

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteMut = useMutation((id) => api.delete(`/admin/combos/${id}`), {
    successMessage: 'Combo deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })

  const toggleMut = useMutation(
    (combo) => {
      const fd = new FormData()
      fd.append('status', combo.status ? '0' : '1')
      return api.putForm(`/admin/combos/${combo.id}`, fd)
    },
    { onSuccess: refetch },
  )

  const combos = data ?? []

  const newButton = can('products.create') && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> New combo
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Combos"
        description="Bundles of existing products. Customers pay the bundle price when they select the complete set, or the sum of selected combo prices when they choose a subset."
      >
        {newButton}
      </PageHeader>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : combos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Layers}
            title="No combos yet"
            description="Create a combo, choose its products, set individual combo prices and optionally set a complete-set price."
            action={newButton}
          />
        </div>
      ) : (
        <div className={cn('grid gap-3 lg:grid-cols-2', refetching && 'opacity-70')}>
          {combos.map((combo) => (
            <article key={combo.id} className="card flex flex-col p-3.5">
              <div className="flex items-start gap-3">
                <Thumb
                  src={combo.image_url}
                  alt={combo.name}
                  className={cn(
                    'h-14 w-14 shrink-0 rounded-[var(--radius-sm)]',
                    !combo.status && 'opacity-40 grayscale',
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[var(--color-ink)]">{combo.name}</h3>
                    <Pill
                      tone={Number(combo.tax_percent) > 0 ? 'info' : 'neutral'}
                      className="shrink-0"
                    >
                      Taxes {Number(Number(combo.tax_percent || 0).toFixed(2))}%
                    </Pill>
                  </div>

                  {combo.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-muted)]">
                      {combo.description}
                    </p>
                  )}
                </div>
              </div>

              {combo.bundle_price != null && (
                <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--color-muted)]">Complete set</span>
                    <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                      {money(combo.bundle_price)}
                    </span>
                  </div>
                  {Number(combo.tax_percent) > 0 && (
                    <p className="mt-0.5 text-right text-xs tabular-nums text-[var(--color-muted)]">
                      Customer pays{' '}
                      {money(withTax(combo.bundle_price, combo.tax_percent).total)}
                    </p>
                  )}
                </div>
              )}

              <ul className="mt-3 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)] text-sm">
                {combo.items.map((item) => (
                  <li
                    key={item.product_id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span
                      className={cn(
                        'min-w-0 truncate',
                        item.available
                          ? 'text-[var(--color-ink-soft)]'
                          : 'text-[var(--color-faint)]',
                      )}
                    >
                      {item.name ?? `Product #${item.product_id}`}

                      {!item.available && (
                        <span className="ml-2 text-xs text-[var(--color-warn)]">
                          Unavailable
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium text-[var(--color-ink)]">
                        {money(item.price)}
                      </span>

                      {item.selling_price != null && (
                        <span className="ml-2 text-xs text-[var(--color-faint)]">
                          shelf {money(item.selling_price)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center justify-between pt-3">
                {can('products.update') ? (
                  <Toggle
                    id={`combo-${combo.id}`}
                    checked={combo.status}
                    onChange={() => toggleMut.mutate(combo)}
                    label={combo.status ? 'Visible' : 'Hidden'}
                  />
                ) : (
                  <ActiveBadge active={combo.status} />
                )}

                <div className="flex gap-0.5">
                  {can('products.update') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Edit combo"
                      onClick={() => setModal({ mode: 'edit', combo })}
                    >
                      <Pencil size={14} />
                    </Button>
                  )}

                  {can('products.delete') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete combo"
                      className="text-[var(--color-danger)]"
                      onClick={() => setDeleteTarget(combo)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <ComboFormModal
          mode={modal.mode}
          combo={modal.combo}
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
        message="The combo is removed from the public shop. Orders already placed keep their items and prices."
        confirmLabel="Delete combo"
      />
    </div>
  )
}

function ComboFormModal({ mode, combo, onClose, onSaved }) {
  const products = useQuery('/admin/products', { params: { per_page: 100 } })
  const productList = products.data ?? []

  const [form, setForm] = useState({
    name: combo?.name ?? '',
    description: combo?.description ?? '',
    bundlePrice:
      combo?.bundle_price === null || combo?.bundle_price === undefined
        ? ''
        : String(combo.bundle_price),
    taxPercent: combo?.tax_percent ?? 0,
    status: combo?.status ?? true,
  })

  const [image, setImage] = useState({ file: null, remove: false })

  const [items, setItems] = useState(() =>
    (combo?.items ?? []).map((i) => ({
      product_id: String(i.product_id),
      name: i.name,
      price: String(i.price),
    })),
  )

  const [pick, setPick] = useState('')
  const [localError, setLocalError] = useState(null)

  const chosen = new Set(items.map((i) => i.product_id))
  const addable = productList.filter((p) => !chosen.has(String(p.id)))

  const productById = (id) =>
    productList.find((p) => String(p.id) === String(id))

  const addItem = () => {
    const product = productById(pick)
    if (!product) return

    setItems((list) => [
      ...list,
      {
        product_id: String(product.id),
        name: product.name,
        price: '',
      },
    ])

    setPick('')
    setLocalError(null)
  }

  const setPrice = (productId, price) =>
    setItems((list) =>
      list.map((i) =>
        i.product_id === productId ? { ...i, price } : i,
      ),
    )

  const removeItem = (productId) =>
    setItems((list) => list.filter((i) => i.product_id !== productId))

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()

      fd.append('name', form.name)
      fd.append('description', form.description ?? '')
      fd.append('status', form.status ? '1' : '0')

      if (form.bundlePrice === '') {
        fd.append('bundle_price', '')
      } else {
        fd.append('bundle_price', String(Number(form.bundlePrice)))
      }

      fd.append('tax_percent', String(Number(form.taxPercent) || 0))

      items.forEach((item, i) => {
        fd.append(`items[${i}][product_id]`, item.product_id)
        fd.append(`items[${i}][price]`, String(Number(item.price)))
      })

      if (image.file) fd.append('image', image.file)
      if (image.remove) fd.append('remove_image', '1')

      return mode === 'create'
        ? api.postForm('/admin/combos', fd)
        : api.putForm(`/admin/combos/${combo.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Combo created.' : 'Combo updated.',
      onSuccess: onSaved,
    },
  )

  const submit = (e) => {
    e.preventDefault()

    if (items.length === 0) {
      setLocalError('Add at least one product.')
      return
    }

    if (
      items.some(
        (i) =>
          i.price === '' ||
          Number(i.price) < 0 ||
          Number.isNaN(Number(i.price)),
      )
    ) {
      setLocalError('Set a combo price for every product.')
      return
    }

    if (
      form.bundlePrice !== '' &&
      (Number(form.bundlePrice) < 0 ||
        Number.isNaN(Number(form.bundlePrice)))
    ) {
      setLocalError('Enter a valid complete-set price or leave it empty.')
      return
    }

    const tax = form.taxPercent === '' ? 0 : Number(form.taxPercent)
    if (Number.isNaN(tax) || tax < 0 || tax > 100) {
      setLocalError('Taxes (%) must be between 0 and 100.')
      return
    }

    setLocalError(null)
    mutate()
  }

  const itemsError = localError || fieldErrors.items

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={mode === 'create' ? 'New combo' : `Edit ${combo.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>

          <Button onClick={submit} loading={pending}>
            {mode === 'create' ? 'Create combo' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="e.g. Hair Care Package"
          />
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Shown on the public combo card"
          />
        </Field>

        <Field
          label="Complete Set Price"
          error={fieldErrors.bundle_price}
          hint="Charged when the customer selects every product in this combo. Leave empty to use the individual combo prices."
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[var(--color-muted)]">₹</span>
            <TextInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 1400"
              value={form.bundlePrice}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bundlePrice: e.target.value,
                }))
              }
            />
          </div>
        </Field>

        <Field
          label="Taxes (%)"
          error={fieldErrors.tax_percent}
          hint="Added on top of the complete-set price or the selected combo prices at checkout."
        >
          <TextInput
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputMode="decimal"
            value={form.taxPercent}
            onChange={(e) =>
              setForm((f) => ({ ...f, taxPercent: e.target.value }))
            }
          />
        </Field>

        <div className="border-t border-[var(--color-line)] pt-4">
          <p className="label">Included products &amp; combo prices</p>

          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Set the price for each product when purchased separately from the
            complete set. A proper subset uses the sum of the selected prices.
          </p>

          {items.length > 0 && (
            <ul className="mt-3 divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
              {items.map((item, i) => {
                const product = productById(item.product_id)

                const rowError =
                  fieldErrors[`items.${i}.price`] ||
                  fieldErrors[`items.${i}.product_id`]

                return (
                  <li key={item.product_id} className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--color-ink)]">
                          {product?.name ??
                            item.name ??
                            `Product #${item.product_id}`}
                        </p>

                        {product?.selling_price != null && (
                          <p className="text-xs text-[var(--color-muted)] tabular-nums">
                            Shelf price {money(product.selling_price)}
                            {!product.status && ' · hidden on the site'}
                          </p>
                        )}
                      </div>

                      <label
                        className="sr-only"
                        htmlFor={`combo-price-${item.product_id}`}
                      >
                        Combo price for {product?.name ?? item.name}
                      </label>

                      <div className="flex w-32 items-center gap-1.5">
                        <span className="text-sm text-[var(--color-muted)]">
                          ₹
                        </span>

                        <TextInput
                          id={`combo-price-${item.product_id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="Combo price"
                          value={item.price}
                          onChange={(e) =>
                            setPrice(item.product_id, e.target.value)
                          }
                          aria-invalid={Boolean(rowError)}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${product?.name ?? item.name}`}
                        onClick={() => removeItem(item.product_id)}
                      >
                        <X size={14} />
                      </Button>
                    </div>

                    {rowError && (
                      <p className="mt-1 text-xs text-[var(--color-danger)]">
                        {rowError}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-3 flex items-end gap-2">
            <Field label="Add a product" className="flex-1">
              <Select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                disabled={products.loading || addable.length === 0}
              >
                <option value="">
                  {products.loading
                    ? 'Loading products…'
                    : products.error
                      ? 'Could not load products'
                      : addable.length === 0
                        ? 'All products added'
                        : 'Choose a product…'}
                </option>

                {addable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.selling_price != null
                      ? ` — ${money(p.selling_price)}`
                      : ''}
                    {!p.status ? ' (hidden)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={!pick}
            >
              <Plus size={14} /> Add
            </Button>
          </div>

          {itemsError && (
            <p
              className="mt-2 text-sm text-[var(--color-danger)]"
              role="alert"
            >
              {itemsError}
            </p>
          )}
        </div>

        <ImageInput
          label={mode === 'create' ? 'Combo photo' : 'Replace photo'}
          currentUrl={combo?.image_url}
          error={fieldErrors.image}
          hint="Optional"
          onChange={setImage}
        />

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">
            Visible on the public site
          </span>

          <Toggle
            id="combo-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
