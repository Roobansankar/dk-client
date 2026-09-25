import { useState } from 'react'
import { Package, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { DataTable } from '../components/DataTable'
import { Modal, ConfirmDialog } from '../components/Modal'
import {
  ActiveBadge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormSection,
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
import { formatMoney } from '../lib/format'
import { withTax } from '../../lib/pricing'

/** Products at or below this many units are treated as low stock. */
const LOW_STOCK_THRESHOLD = 3

const taxText = (pct) => `${Number(Number(pct || 0).toFixed(2))}%`

const stockOf = (p) => p.stock_quantity ?? 0

/** Whole-number saving, e.g. MRP 800 → price 720 ⇒ 10. */
function discountPct(mrp, price) {
  if (mrp == null || price == null || Number(mrp) <= Number(price) || Number(mrp) <= 0) return 0
  return Math.round((1 - Number(price) / Number(mrp)) * 100)
}

const isOut = (p) => stockOf(p) <= 0
const isLow = (p) => stockOf(p) > 0 && stockOf(p) <= LOW_STOCK_THRESHOLD
const isHealthy = (p) => stockOf(p) > LOW_STOCK_THRESHOLD

const STOCK_OPTIONS = [
  { value: 'all', label: 'All stock levels', test: () => true },
  { value: 'in', label: 'In stock', test: isHealthy },
  { value: 'low', label: `Low stock (${LOW_STOCK_THRESHOLD} or fewer)`, test: isLow },
  { value: 'out', label: 'Out of stock', test: isOut },
]

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All products', test: () => true },
  { value: 'visible', label: 'Visible on site', test: (p) => Boolean(p.status) },
  { value: 'hidden', label: 'Hidden from site', test: (p) => !p.status },
]

const num = (v) => (v == null ? 0 : Number(v))

const SORT_OPTIONS = [
  { value: 'default', label: 'Default order', compare: null },
  { value: 'name', label: 'Name (A–Z)', compare: (a, b) => (a.name ?? '').localeCompare(b.name ?? '') },
  { value: 'price_asc', label: 'Price: low to high', compare: (a, b) => num(a.selling_price) - num(b.selling_price) },
  { value: 'price_desc', label: 'Price: high to low', compare: (a, b) => num(b.selling_price) - num(a.selling_price) },
  { value: 'stock_asc', label: 'Stock: low to high', compare: (a, b) => stockOf(a) - stockOf(b) },
  { value: 'sold_desc', label: 'Best selling', compare: (a, b) => num(b.items_sold) - num(a.items_sold) },
]

export default function ProductsPage() {
  const { can } = useAuth()
  const canUpdate = can('products.update')
  const canDelete = can('products.delete')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/products', {
    params: { per_page: 100 },
  })

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filters, setFilters] = useState({ search: '', stock: 'all', visibility: 'all', sort: 'default' })
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }))

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
  const totalStock = products.reduce((sum, p) => sum + stockOf(p), 0)
  const totalSold = products.reduce((sum, p) => sum + (p.items_sold ?? 0), 0)
  const visibleOnSite = products.filter((p) => p.status).length
  const lowCount = products.filter(isLow).length
  const outCount = products.filter(isOut).length

  const stockTest = STOCK_OPTIONS.find((o) => o.value === filters.stock)?.test ?? (() => true)
  const visibilityTest =
    VISIBILITY_OPTIONS.find((o) => o.value === filters.visibility)?.test ?? (() => true)
  const compare = SORT_OPTIONS.find((o) => o.value === filters.sort)?.compare
  const query = filters.search.trim().toLowerCase()

  const shown = products.filter(
    (p) =>
      stockTest(p) &&
      visibilityTest(p) &&
      (!query || (p.name ?? '').toLowerCase().includes(query)),
  )
  if (compare) shown.sort(compare)

  const filtered = filters.search !== '' || filters.stock !== 'all' || filters.visibility !== 'all'
  const clearFilters = () => setFilters((f) => ({ ...f, search: '', stock: 'all', visibility: 'all' }))

  const newButton = can('products.create') && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> Add product
    </Button>
  )

  // Row cells hold their own controls — keep their clicks from also opening the row.
  const stop = (node) => <div onClick={(e) => e.stopPropagation()}>{node}</div>

  const columns = [
    {
      key: 'product',
      header: 'Product',
      cell: (p) => (
        <div className="flex min-w-[13rem] items-center gap-3">
          <Thumb
            src={p.image_url}
            alt=""
            iconSize={16}
            className={cn(
              'h-11 w-11 shrink-0 rounded-[var(--radius-md)] border border-[var(--color-line)]',
              !p.status && 'opacity-40 grayscale',
            )}
          />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate font-medium text-[var(--color-ink)]" title={p.name}>
                {p.name}
              </span>
              {p.is_featured && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-ink)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-surface)]">
                  <Star size={10} aria-hidden="true" /> Featured
                </span>
              )}
            </p>
            <p className="max-w-[22rem] truncate text-xs text-[var(--color-muted)]">
              {p.description || 'No description'}
            </p>
            <p className="mt-1 flex items-center gap-2 md:hidden">
              <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                {formatMoney(p.selling_price)}
              </span>
              <StockPill quantity={p.stock_quantity} />
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      hideBelow: 'md',
      cell: (p) => {
        const hasTax = Number(p.tax_percent) > 0
        const total = p.selling_price != null ? withTax(p.selling_price, p.tax_percent).total : null
        const off = discountPct(p.mrp, p.selling_price)
        return (
          <div className="tabular-nums">
            <p className="flex items-baseline gap-x-2 whitespace-nowrap">
              <span className="font-semibold text-[var(--color-ink)]">
                {formatMoney(p.selling_price)}
              </span>
              {off > 0 && (
                <span className="text-xs text-[var(--color-faint)] line-through">
                  {formatMoney(p.mrp)}
                </span>
              )}
            </p>
            {(off > 0 || (hasTax && total != null)) && (
              <p className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                {off > 0 && (
                  <span className="font-medium text-[var(--color-ok)]">{off}% off</span>
                )}
                {off > 0 && hasTax && total != null && ' · '}
                {hasTax && total != null && `${formatMoney(total)} incl. tax`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'tax',
      header: 'Tax',
      hideBelow: 'md',
      cell: (p) => (
        <span className="tabular-nums">
          {Number(p.tax_percent) > 0 ? taxText(p.tax_percent) : '—'}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      hideBelow: 'md',
      cell: (p) => <StockPill quantity={p.stock_quantity} />,
    },
    {
      key: 'sold',
      header: 'Sold',
      hideBelow: 'md',
      cell: (p) => <span className="tabular-nums">{(p.items_sold ?? 0).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'On site',
      cell: (p) =>
        canUpdate
          ? stop(
              <Toggle
                id={`product-${p.id}`}
                checked={Boolean(p.status)}
                disabled={toggleMut.pending}
                onChange={() => toggleMut.mutate(p)}
                label={p.status ? 'Visible' : 'Hidden'}
              />,
            )
          : <ActiveBadge active={p.status} />,
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (p) =>
              stop(
                <div className="flex items-center justify-end gap-1">
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => setModal({ mode: 'edit', product: p })}
                    >
                      <Pencil size={13} /> Edit
                    </Button>
                  )}
                  {canDelete && (
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
                  )}
                </div>,
              ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        description="The retail shelf shown on the public Products page. Keep prices, taxes and stock up to date here."
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
              items={[
                {
                  label: 'Products',
                  value: products.length.toLocaleString('en-IN'),
                  hint: `${visibleOnSite} visible on the site`,
                },
                {
                  label: 'Units in stock',
                  value: totalStock.toLocaleString('en-IN'),
                  hint: 'Across all products',
                },
                {
                  label: 'Items sold',
                  value: totalSold.toLocaleString('en-IN'),
                  hint: 'Through product orders',
                },
                {
                  label: 'Need restocking',
                  value: (lowCount + outCount).toLocaleString('en-IN'),
                  hint:
                    lowCount + outCount === 0
                      ? 'Everything is well stocked'
                      : `${outCount} out · ${lowCount} low (${LOW_STOCK_THRESHOLD} or fewer)`,
                },
              ]}
            />
          )}

          <Toolbar className="!mb-0">
            <SearchInput
              wrapperClassName="min-w-[12rem] flex-1"
              placeholder="Search by product name"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
            />

            <Field label="Stock" htmlFor="products-stock" className="w-[calc(50%-0.375rem)] sm:w-52">
              <Select id="products-stock" value={filters.stock} onChange={(e) => setFilter({ stock: e.target.value })}>
                {STOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${products.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Visibility" htmlFor="products-visibility" className="w-[calc(50%-0.375rem)] sm:w-44">
              <Select
                id="products-visibility"
                value={filters.visibility}
                onChange={(e) => setFilter({ visibility: e.target.value })}
              >
                {VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${products.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sort by" htmlFor="products-sort" className="w-full sm:w-48">
              <Select id="products-sort" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
              onRowClick={canUpdate ? (p) => setModal({ mode: 'edit', product: p }) : undefined}
              empty={
                <EmptyState
                  icon={Package}
                  title={products.length === 0 ? 'No products yet' : 'No products match'}
                  description={
                    products.length === 0
                      ? 'Add a product with a photo, MRP, selling price, stock and taxes.'
                      : 'Try a different search or filter.'
                  }
                  action={products.length === 0 ? newButton : undefined}
                />
              }
            />
            {!loading && shown.length > 0 && (
              <p className="border-t border-[var(--color-line)] px-3 py-3 text-xs text-[var(--color-muted)]">
                Showing {shown.length} of {products.length} product{products.length === 1 ? '' : 's'}
                {canUpdate && ' · click a row to edit it'}
              </p>
            )}
          </div>
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
        message="The product is removed from the public shelf. This can't be undone here. To just take it off the site for now, hide it instead."
        confirmLabel="Delete product"
      />
    </div>
  )
}

function StockPill({ quantity }) {
  const qty = quantity ?? 0
  const tone = qty === 0 ? 'danger' : qty <= LOW_STOCK_THRESHOLD ? 'warn' : 'ok'
  return (
    <Pill tone={tone} className="shrink-0 whitespace-nowrap tabular-nums">
      {qty === 0 ? 'Out of stock' : qty <= LOW_STOCK_THRESHOLD ? `Only ${qty} left` : `${qty} in stock`}
    </Pill>
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
  const discount = priceOrderInvalid ? 0 : discountPct(mrpNum, sellingNum)

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
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FormSection title="Details">
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
        </FormSection>

        <FormSection title="Pricing" hint="Enter amounts before tax.">
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

          <Field
            label="Taxes (%)"
            error={fieldErrors.tax_percent}
            hint="Added on top of the selling price at checkout."
            className="sm:w-1/2"
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

          {preview && (
            <p className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs tabular-nums text-[var(--color-ink-soft)]">
              Customer pays{' '}
              <strong className="font-semibold text-[var(--color-ink)]">
                {formatMoney(preview.total)}
              </strong>{' '}
              = {formatMoney(preview.base)} + {formatMoney(preview.tax)} tax
              {discount > 0 && <> · {discount}% off MRP</>}
            </p>
          )}
        </FormSection>

        <FormSection title="Stock">
          <Field
            label="Stock available"
            required
            error={fieldErrors.stock_quantity}
            hint="Changes are logged in the stock history."
            className="sm:w-1/2"
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
        </FormSection>

        <FormSection title="Visibility">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--color-ink-soft)]">Visible on the public site</span>
            <Toggle
              id="product-status"
              checked={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--color-ink-soft)]">
              Featured product
              <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                Highlighted on the Products page. Only one product can be featured — turning
                this on removes it from any other product.
              </span>
            </span>
            <Toggle
              id="product-featured"
              checked={form.is_featured}
              onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
            />
          </div>
        </FormSection>
      </form>
    </Modal>
  )
}
