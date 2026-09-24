import { useState } from 'react'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
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
  SectionCard,
  StatGrid,
  Textarea,
  TextInput,
  Thumb,
  Toggle,
  cn,
} from '../components/ui'
import { ImageInput } from '../components/ImageInput'
import { formatMoney } from '../lib/format'
import { withTax } from '../../lib/pricing'

/** Products at or below this many units are listed under Low Stock. */
const LOW_STOCK_THRESHOLD = 3

const taxText = (pct) => `${Number(Number(pct || 0).toFixed(2))}%`

export default function ProductsPage() {
  const { can } = useAuth()
  const canManage = can('products.create') || can('products.update') || can('products.delete')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/products', {
    params: { per_page: 100 },
  })

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteMut = useMutation((id) => api.delete(`/admin/products/${id}`), {
    successMessage: 'Product deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })
  const toggleMut = useMutation(
    (product) => {
      const fd = new FormData()
      fd.append('status', product.status ? '0' : '1')
      return api.putForm(`/admin/products/${product.id}`, fd)
    },
    { onSuccess: refetch },
  )

  const products = data ?? []
  const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0)
  const totalSold = products.reduce((sum, p) => sum + (p.items_sold ?? 0), 0)
  const lowStock = products
    .filter((p) => (p.stock_quantity ?? 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))

  const newButton = can('products.create') && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> Add Product
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Products"
        description="The retail shelf shown on the public /products page."
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className={cn('flex flex-col gap-5', refetching && 'opacity-70')}>
          <StatGrid
            columns={2}
            items={[
              {
                label: 'Current Stock',
                value: totalStock.toLocaleString('en-IN'),
                hint: `Units across ${products.length} product${products.length === 1 ? '' : 's'}`,
              },
              {
                label: 'Items Sold',
                value: totalSold.toLocaleString('en-IN'),
                hint: 'Units sold through product orders',
              },
            ]}
          />

          <SectionCard
            title="Low Stock"
            description={`Products with ${LOW_STOCK_THRESHOLD} or fewer units left.`}
            bodyClassName={lowStock.length ? 'p-0' : undefined}
          >
            {lowStock.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                {products.length === 0
                  ? 'No products yet.'
                  : `Every product has more than ${LOW_STOCK_THRESHOLD} units in stock.`}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Thumb
                      src={product.image_url}
                      alt={product.name}
                      className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)]"
                      iconSize={14}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)]">
                      {product.name}
                      {!product.status && (
                        <span className="ml-2 text-xs text-[var(--color-muted)]">Hidden</span>
                      )}
                    </span>
                    <StockPill quantity={product.stock_quantity} />
                    {can('products.update') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => setModal({ mode: 'edit', product })}
                      >
                        <Pencil size={14} />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {newButton && <div>{newButton}</div>}

          {products.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Add a product with a photo, MRP, selling price, stock and taxes."
              />
            </div>
          ) : (
            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  can={can}
                  canManage={canManage}
                  onToggle={() => toggleMut.mutate(product)}
                  onEdit={() => setModal({ mode: 'edit', product })}
                  onDelete={() => setDeleteTarget(product)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <ProductFormModal
          mode={modal.mode}
          product={modal.product}
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
        message="The product is removed from the public shelf. This can't be undone here."
        confirmLabel="Delete product"
      />
    </div>
  )
}

function StockPill({ quantity }) {
  const qty = quantity ?? 0
  const tone = qty === 0 ? 'danger' : qty <= LOW_STOCK_THRESHOLD ? 'warn' : 'ok'
  return (
    <Pill tone={tone} className="shrink-0 tabular-nums">
      {qty === 0 ? 'Out of stock' : `${qty} in stock`}
    </Pill>
  )
}

function ProductCard({ product, can, canManage, onToggle, onEdit, onDelete }) {
  const hasTax = Number(product.tax_percent) > 0
  const price =
    product.selling_price != null ? withTax(product.selling_price, product.tax_percent) : null

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      {/* Fixed 4:3 frame; the image is absolutely positioned so its intrinsic
          size can never stretch the frame (and with it, the card). */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--color-surface-sunken)]">
        <Thumb
          src={product.image_url}
          alt={product.name}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            !product.status && 'opacity-40 grayscale',
          )}
        />
        {!product.status && (
          <span className="absolute right-1.5 top-1.5 rounded-[3px] bg-[var(--color-neutral-tint)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-neutral)]">
            Hidden
          </span>
        )}
        {product.is_featured && (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-[var(--color-ink)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-surface)]">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-medium text-[var(--color-ink)]" title={product.name}>
            {product.name}
          </h3>
          <Pill tone={hasTax ? 'info' : 'neutral'} className="shrink-0">
            Taxes {taxText(product.tax_percent)}
          </Pill>
        </div>

        <p className="mt-1 h-5 truncate text-sm leading-5 tabular-nums text-[var(--color-ink-soft)]">
          <span className="text-[var(--color-ink)]">{formatMoney(product.selling_price)}</span>
          {product.mrp != null &&
            product.selling_price != null &&
            product.mrp > product.selling_price && (
              <span className="ml-2 text-[var(--color-faint)] line-through">
                {formatMoney(product.mrp)}
              </span>
            )}
        </p>
        <p className="mt-0.5 h-4 truncate text-xs leading-4 tabular-nums text-[var(--color-muted)]">
          {price && hasTax
            ? `Customer pays ${formatMoney(price.total)} (incl. ${formatMoney(price.tax)} tax)`
            : '\u00a0'}
        </p>

        <p className="mt-2 line-clamp-2 h-10 text-sm leading-5 text-[var(--color-muted)]">
          {product.description || '\u00a0'}
        </p>

        <div className="mb-3 mt-3 flex items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
          <StockPill quantity={product.stock_quantity} />
          <span className="tabular-nums">{(product.items_sold ?? 0).toLocaleString('en-IN')} sold</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-line)] pt-3">
          {can('products.update') ? (
            <Toggle
              id={`product-${product.id}`}
              checked={product.status}
              onChange={onToggle}
              label={product.status ? 'Visible' : 'Hidden'}
            />
          ) : (
            <ActiveBadge active={product.status} />
          )}
          {canManage && (
            <div className="flex gap-0.5">
              {can('products.update') && (
                <Button variant="ghost" size="sm" aria-label="Edit product" onClick={onEdit}>
                  <Pencil size={14} />
                </Button>
              )}
              {can('products.delete') && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete product"
                  className="text-[var(--color-danger)]"
                  onClick={onDelete}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function ProductFormModal({ mode, product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    mrp: product?.mrp ?? '',
    selling_price: product?.selling_price ?? '',
    stock_quantity: product?.stock_quantity ?? 0,
    tax_percent: product?.tax_percent ?? 0,
    // Legacy flag — no longer edited here, but preserved as-is on save.
    gst_inclusive: product?.gst_inclusive ?? true,
    status: product?.status ?? true,
    is_featured: product?.is_featured ?? false,
  })
  const [image, setImage] = useState({ file: null, remove: false })

  const mrpNum = form.mrp === '' ? null : Number(form.mrp)
  const sellingNum = form.selling_price === '' ? null : Number(form.selling_price)
  const priceOrderInvalid =
    mrpNum != null && sellingNum != null && sellingNum > mrpNum
  const taxNum = form.tax_percent === '' ? 0 : Number(form.tax_percent)
  const preview =
    sellingNum != null && !Number.isNaN(sellingNum) && taxNum >= 0 && taxNum <= 100
      ? withTax(sellingNum, taxNum)
      : null

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description ?? '')
      fd.append('mrp', form.mrp === '' ? '' : String(Number(form.mrp)))
      fd.append('selling_price', form.selling_price === '' ? '' : String(Number(form.selling_price)))
      fd.append('stock_quantity', String(Math.max(0, Math.floor(Number(form.stock_quantity) || 0))))
      fd.append('tax_percent', String(Number(form.tax_percent) || 0))
      fd.append('gst_inclusive', form.gst_inclusive ? '1' : '0')
      fd.append('status', form.status ? '1' : '0')
      fd.append('is_featured', form.is_featured ? '1' : '0')
      if (image.file) fd.append('image', image.file)
      if (image.remove) fd.append('remove_image', '1')
      return mode === 'create'
        ? api.postForm('/admin/products', fd)
        : api.putForm(`/admin/products/${product.id}`, fd)
    },
    {
      successMessage: mode === 'create' ? 'Product created.' : 'Product updated.',
      onSuccess: onSaved,
    },
  )

  const submit = (e) => {
    e.preventDefault()
    if (priceOrderInvalid) return
    mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'New product' : `Edit ${product.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={priceOrderInvalid}>
            {mode === 'create' ? 'Create product' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <ImageInput
          label={mode === 'create' ? 'Product photo' : 'Replace photo'}
          currentUrl={product?.image_url}
          error={fieldErrors.image}
          hint="Optional — a placeholder is shown on the site when there's no photo"
          onChange={setImage}
        />

        <Field label="Name" required error={fieldErrors.name}>
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
            placeholder="Shown on the public product card"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="MRP (₹)" required error={fieldErrors.mrp}>
            <TextInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.mrp}
              onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
            />
          </Field>
          <Field
            label="Selling price (₹)"
            required
            error={
              fieldErrors.selling_price ||
              (priceOrderInvalid ? 'Cannot be higher than the MRP.' : undefined)
            }
          >
            <TextInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.selling_price}
              onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Stock Available"
            required
            error={fieldErrors.stock_quantity}
            hint="Changes are logged in the stock history."
          >
            <TextInput
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.stock_quantity}
              onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
            />
          </Field>
          <Field
            label="Taxes (%)"
            error={fieldErrors.tax_percent}
            hint="Added on top of the selling price at checkout."
          >
            <TextInput
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={form.tax_percent}
              onChange={(e) => setForm((f) => ({ ...f, tax_percent: e.target.value }))}
            />
          </Field>
        </div>

        {preview && (
          <p className="-mt-1 text-xs tabular-nums text-[var(--color-muted)]">
            Customer pays {formatMoney(preview.total)} = {formatMoney(preview.base)} +{' '}
            {formatMoney(preview.tax)} tax
          </p>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
          <Toggle
            id="product-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">
            Featured Product
            <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
              Highlighted on /products. Only one product can be featured — turning
              this on removes it from any other product.
            </span>
          </span>
          <Toggle
            id="product-featured"
            checked={form.is_featured}
            onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
          />
        </div>
      </form>
    </Modal>
  )
}
