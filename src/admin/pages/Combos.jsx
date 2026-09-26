import { useState } from 'react'
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
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
import { ImageGalleryInput } from '../components/ImageGalleryInput'
import { appendGalleryFields, galleryError, galleryFromServer } from '../lib/gallery'
import { formatMoney as money } from '../lib/format'
import { taxIncluded } from '../../lib/pricing'

/**
 * Admin → Combos (/api/admin/combos).
 *
 * A combo contains existing products with individual combo-specific prices.
 * Customers may select any non-empty subset:
 *
 * - Proper subset → sum of selected combo prices.
 * - Complete set → configured bundle price, when present.
 *
 * The combo's tax % is already inside either amount — nothing is added at checkout.
 */

const num = (v) => (v == null || v === '' ? 0 : Number(v))
const taxText = (pct) => `${Number(Number(pct || 0).toFixed(2))}%`

const itemsOf = (c) => c.items ?? []
/** What the products cost together at their combo prices. */
const itemsTotal = (c) => itemsOf(c).reduce((sum, i) => sum + num(i.price), 0)
const unavailableOf = (c) => itemsOf(c).filter((i) => !i.available)
const hasIssue = (c) => unavailableOf(c).length > 0
/** The price a customer pays for the whole combo (tax included). */
const wholePrice = (c) => (c.bundle_price != null ? num(c.bundle_price) : itemsTotal(c))

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All combos', test: () => true },
  { value: 'visible', label: 'Visible on site', test: (c) => Boolean(c.status) },
  { value: 'hidden', label: 'Hidden from site', test: (c) => !c.status },
]

const PRODUCTS_OPTIONS = [
  { value: 'all', label: 'Any products', test: () => true },
  { value: 'ok', label: 'All products available', test: (c) => !hasIssue(c) },
  { value: 'issue', label: 'Has unavailable products', test: hasIssue },
]

const SORT_OPTIONS = [
  { value: 'default', label: 'Default order', compare: null },
  { value: 'name', label: 'Name (A–Z)', compare: (a, b) => (a.name ?? '').localeCompare(b.name ?? '') },
  { value: 'price_asc', label: 'Price: low to high', compare: (a, b) => wholePrice(a) - wholePrice(b) },
  { value: 'price_desc', label: 'Price: high to low', compare: (a, b) => wholePrice(b) - wholePrice(a) },
  { value: 'products_desc', label: 'Most products', compare: (a, b) => itemsOf(b).length - itemsOf(a).length },
]

export default function CombosPage() {
  const { can } = useAuth()
  const canUpdate = can('products.update')
  const canDelete = can('products.delete')

  const { data, loading, error, refetch, refetching } = useQuery('/admin/combos', {
    params: { per_page: 100 },
  })

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filters, setFilters] = useState({ search: '', visibility: 'all', products: 'all', sort: 'default' })
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }))

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
  const visibleOnSite = combos.filter((c) => c.status).length
  const withSetPrice = combos.filter((c) => c.bundle_price != null).length
  const needAttention = combos.filter(hasIssue).length

  const visibilityTest =
    VISIBILITY_OPTIONS.find((o) => o.value === filters.visibility)?.test ?? (() => true)
  const productsTest =
    PRODUCTS_OPTIONS.find((o) => o.value === filters.products)?.test ?? (() => true)
  const compare = SORT_OPTIONS.find((o) => o.value === filters.sort)?.compare
  const query = filters.search.trim().toLowerCase()

  const shown = combos.filter(
    (c) =>
      visibilityTest(c) &&
      productsTest(c) &&
      (!query ||
        (c.name ?? '').toLowerCase().includes(query) ||
        itemsOf(c).some((i) => (i.name ?? '').toLowerCase().includes(query))),
  )
  if (compare) shown.sort(compare)

  const filtered = filters.search !== '' || filters.visibility !== 'all' || filters.products !== 'all'
  const clearFilters = () =>
    setFilters((f) => ({ ...f, search: '', visibility: 'all', products: 'all' }))

  const newButton = can('products.create') && (
    <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
      <Plus size={15} /> New combo
    </Button>
  )

  // Row cells hold their own controls — keep their clicks from also opening the row.
  const stop = (node) => <div onClick={(e) => e.stopPropagation()}>{node}</div>

  const columns = [
    {
      key: 'combo',
      header: 'Combo',
      cell: (c) => (
        <div className="flex min-w-[13rem] items-center gap-3">
          <Thumb
            src={c.image_url}
            alt=""
            iconSize={16}
            className={cn(
              'h-11 w-11 shrink-0 rounded-[var(--radius-md)] border border-[var(--color-line)]',
              !c.status && 'opacity-40 grayscale',
            )}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--color-ink)]" title={c.name}>
              {c.name}
            </p>
            <p className="max-w-[20rem] truncate text-xs text-[var(--color-muted)]">
              {c.description || 'No description'}
            </p>
            <p className="mt-1 flex items-center gap-2 md:hidden">
              <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                {money(wholePrice(c))}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {itemsOf(c).length} product{itemsOf(c).length === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      hideBelow: 'md',
      cell: (c) => {
        const items = itemsOf(c)
        const bad = unavailableOf(c)
        return (
          <div className="min-w-[10rem]">
            <p className="flex items-center gap-2 text-[var(--color-ink)]">
              {items.length} product{items.length === 1 ? '' : 's'}
              {bad.length > 0 && <Pill tone="warn">{bad.length} unavailable</Pill>}
            </p>
            <p
              className="max-w-[16rem] truncate text-xs text-[var(--color-muted)]"
              title={items
                .map((i) => `${i.name ?? `Product #${i.product_id}`} — ${money(i.price)}`)
                .join('\n')}
            >
              {items.map((i) => i.name ?? `Product #${i.product_id}`).join(', ') || '—'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'price',
      header: 'Price',
      hideBelow: 'md',
      cell: (c) => {
        const hasSet = c.bundle_price != null
        const hasTax = Number(c.tax_percent) > 0
        return (
          <div className="tabular-nums">
            <p className="whitespace-nowrap">
              <span className="font-semibold text-[var(--color-ink)]">{money(wholePrice(c))}</span>
              <span className="ml-1.5 text-xs text-[var(--color-muted)]">
                {hasSet ? 'complete set' : 'items total'}
              </span>
            </p>
            <p className="whitespace-nowrap text-xs text-[var(--color-muted)]">
              {hasTax
                ? 'incl. tax'
                : hasSet
                  ? `Items total ${money(itemsTotal(c))}`
                  : 'No complete-set price'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'tax',
      header: 'Tax',
      hideBelow: 'md',
      cell: (c) => (
        <span className="tabular-nums">
          {Number(c.tax_percent) > 0 ? taxText(c.tax_percent) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'On site',
      cell: (c) =>
        canUpdate
          ? stop(
              <Toggle
                id={`combo-${c.id}`}
                checked={Boolean(c.status)}
                disabled={toggleMut.pending}
                onChange={() => toggleMut.mutate(c)}
                label={c.status ? 'Visible' : 'Hidden'}
              />,
            )
          : <ActiveBadge active={c.status} />,
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (c) =>
              stop(
                <div className="flex items-center justify-end gap-1">
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => setModal({ mode: 'edit', combo: c })}
                    >
                      <Pencil size={13} /> Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${c.name}`}
                      title="Delete"
                      className="text-[var(--color-danger)]"
                      onClick={() => setDeleteTarget(c)}
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
        title="Combos"
        description="Bundles of existing products. Customers pay the complete-set price when they take every product, or the sum of the combo prices for the ones they choose."
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
                  label: 'Combos',
                  value: combos.length.toLocaleString('en-IN'),
                  hint: `${visibleOnSite} visible on the site`,
                },
                {
                  label: 'With complete-set price',
                  value: withSetPrice.toLocaleString('en-IN'),
                  hint:
                    combos.length === 0
                      ? '—'
                      : `${combos.length - withSetPrice} use the items total`,
                },
                {
                  label: 'Products in combos',
                  value: new Set(combos.flatMap((c) => itemsOf(c).map((i) => i.product_id))).size.toLocaleString('en-IN'),
                  hint: 'Different products used',
                },
                {
                  label: 'Need attention',
                  value: needAttention.toLocaleString('en-IN'),
                  hint:
                    needAttention === 0
                      ? 'All products are available'
                      : 'Contain an unavailable product',
                },
              ]}
            />
          )}

          <Toolbar className="!mb-0">
            <SearchInput
              wrapperClassName="min-w-[12rem] flex-1"
              placeholder="Search by combo or product name"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
            />

            <Field label="Visibility" htmlFor="combos-visibility" className="w-[calc(50%-0.375rem)] sm:w-44">
              <Select
                id="combos-visibility"
                value={filters.visibility}
                onChange={(e) => setFilter({ visibility: e.target.value })}
              >
                {VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${combos.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Products" htmlFor="combos-products" className="w-[calc(50%-0.375rem)] sm:w-52">
              <Select
                id="combos-products"
                value={filters.products}
                onChange={(e) => setFilter({ products: e.target.value })}
              >
                {PRODUCTS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {!loading && o.value !== 'all' ? ` (${combos.filter(o.test).length})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sort by" htmlFor="combos-sort" className="w-full sm:w-48">
              <Select
                id="combos-sort"
                value={filters.sort}
                onChange={(e) => setFilter({ sort: e.target.value })}
              >
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
              onRowClick={canUpdate ? (c) => setModal({ mode: 'edit', combo: c }) : undefined}
              renderExpanded={(c) => <ComboProducts combo={c} />}
              empty={
                <EmptyState
                  icon={Layers}
                  title={combos.length === 0 ? 'No combos yet' : 'No combos match'}
                  description={
                    combos.length === 0
                      ? 'Create a combo, choose its products, set individual combo prices and optionally set a complete-set price.'
                      : 'Try a different search or filter.'
                  }
                  action={combos.length === 0 ? newButton : undefined}
                />
              }
            />
            {!loading && shown.length > 0 && (
              <p className="border-t border-[var(--color-line)] px-3 py-3 text-xs text-[var(--color-muted)]">
                Showing {shown.length} of {combos.length} combo{combos.length === 1 ? '' : 's'}
                {' · use the arrow on a row to see its products'}
                {canUpdate && ', or click the row to edit it'}
              </p>
            )}
          </div>
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
        message="The combo is removed from the public shop. Orders already placed keep their items and prices. To just take it off the site for now, hide it instead."
        confirmLabel="Delete combo"
      />
    </div>
  )
}

/** The products inside a combo, with their combo and shelf prices — shown when a row is expanded. */
function ComboProducts({ combo }) {
  const items = itemsOf(combo)
  const hasSet = combo.bundle_price != null
  const hasTax = Number(combo.tax_percent) > 0
  const shelfTotal = items.reduce((sum, i) => sum + num(i.selling_price), 0)
  const saving = hasSet ? itemsTotal(combo) - num(combo.bundle_price) : 0

  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
        This combo has no products yet.
      </p>
    )
  }

  const th = 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]'
  const foot = 'px-3 py-2 text-[var(--color-ink-soft)]'

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Products in {combo.name}</caption>
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            <th className={th}>Product</th>
            <th className={cn(th, 'text-right')}>Combo price</th>
            <th className={cn(th, 'text-right')}>Shelf price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.product_id} className="border-b border-[var(--color-line)]">
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'font-medium',
                    i.available ? 'text-[var(--color-ink)]' : 'text-[var(--color-faint)]',
                  )}
                >
                  {i.name ?? `Product #${i.product_id}`}
                </span>
                {!i.available && (
                  <Pill tone="warn" className="ml-2">
                    Unavailable
                  </Pill>
                )}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-[var(--color-ink)]">
                {money(i.price)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--color-muted)]">
                {i.selling_price != null ? money(i.selling_price) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[var(--color-surface-sunken)] tabular-nums">
          <tr>
            <td className={foot}>All {items.length} together</td>
            <td className={cn(foot, 'text-right font-medium')}>{money(itemsTotal(combo))}</td>
            <td className={cn(foot, 'text-right text-[var(--color-muted)]')}>{money(shelfTotal)}</td>
          </tr>
          {hasSet && (
            <tr className="border-t border-[var(--color-line)]">
              <td className={foot}>
                Complete set price
                {saving > 0 && (
                  <span className="ml-2 text-xs text-[var(--color-ok)]">saves {money(saving)}</span>
                )}
              </td>
              <td className={cn(foot, 'text-right font-semibold text-[var(--color-ink)]')}>
                {money(combo.bundle_price)}
              </td>
              <td />
            </tr>
          )}
          {hasTax && (
            <tr className="border-t border-[var(--color-line)]">
              <td className={foot}>
                Tax included in the whole combo ({taxText(combo.tax_percent)})
              </td>
              <td className={cn(foot, 'text-right font-medium')}>
                {money(taxIncluded(wholePrice(combo), combo.tax_percent).tax)}
              </td>
              <td />
            </tr>
          )}
        </tfoot>
      </table>
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

  // Up to four photos, first = cover. Existing ones keep their id; new ones are files.
  const [initialGallery] = useState(() => galleryFromServer(combo?.images))
  const [gallery, setGallery] = useState(initialGallery)

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

  // Live summary of what the customer will pay, so a price typo shows up here.
  const itemsSum = items.reduce((sum, i) => sum + num(i.price), 0)
  const pricesFilled = items.length > 0 && items.every((i) => i.price !== '')
  const bundleNum = form.bundlePrice === '' ? null : Number(form.bundlePrice)
  const taxNum = form.taxPercent === '' ? 0 : Number(form.taxPercent)
  const taxOk = !Number.isNaN(taxNum) && taxNum >= 0 && taxNum <= 100
  const wholeAmount = bundleNum != null && !Number.isNaN(bundleNum) ? bundleNum : itemsSum
  const wholeSplit = taxOk ? taxIncluded(wholeAmount, taxNum) : null
  const saving = bundleNum != null && !Number.isNaN(bundleNum) ? itemsSum - bundleNum : 0

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

      appendGalleryFields(fd, gallery, initialGallery)

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
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FormSection title="Details">
          <ImageGalleryInput
            label="Photos"
            items={gallery}
            onChange={setGallery}
            error={galleryError(fieldErrors)}
            hint="Up to 4 photos — the first is the cover; all of them show on the combo page. Optional."
          />

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
        </FormSection>

        <FormSection
          title="Included products & combo prices"
          hint="Set each product's price (tax included) when bought as part of this combo. A customer who picks only some products pays the sum of those prices."
        >
          {items.length > 0 && (
            <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
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

          <div className="flex items-end gap-2">
            <Field label="Add a product" htmlFor="combo-add-product" className="flex-1">
              <Select
                id="combo-add-product"
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
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {itemsError}
            </p>
          )}
        </FormSection>

        <FormSection title="Complete set & taxes">
          <Field
            label="Complete set price"
            htmlFor="combo-bundle-price"
            error={fieldErrors.bundle_price}
            hint="Charged (tax included) when the customer selects every product in this combo. Leave empty to use the individual combo prices."
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[var(--color-muted)]">₹</span>
              <TextInput
                id="combo-bundle-price"
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
            htmlFor="combo-tax"
            error={fieldErrors.tax_percent}
            hint="Already included in the complete-set price and the combo prices — not added on top at checkout."
            className="sm:w-1/2"
          >
            <TextInput
              id="combo-tax"
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

          {pricesFilled && wholeSplit && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs tabular-nums text-[var(--color-ink-soft)]">
              <p>
                Whole combo: customer pays{' '}
                <strong className="font-semibold text-[var(--color-ink)]">
                  {money(wholeSplit.total)}
                </strong>
                {Number(taxNum) > 0 && <> · includes {money(wholeSplit.tax)} tax</>}
              </p>
              <p className="mt-0.5 text-[var(--color-muted)]">
                Products add up to {money(itemsSum)} at their combo prices
                {saving > 0 && <> · the complete-set price saves {money(saving)}</>}
                {saving < 0 && <> · the complete-set price is {money(-saving)} higher than that</>}
              </p>
            </div>
          )}
        </FormSection>

        <FormSection title="Visibility">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--color-ink-soft)]">
              Visible on the public site
            </span>

            <Toggle
              id="combo-status"
              checked={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
          </div>
        </FormSection>
      </form>
    </Modal>
  )
}
