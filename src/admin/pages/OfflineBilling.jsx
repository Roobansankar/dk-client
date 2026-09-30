import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useDebounced } from '../hooks/useDebounced'
import {
  Button,
  ChipButton,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Pill,
  SearchInput,
  SectionCard,
  Select,
  TextInput,
  Thumb,
} from '../components/ui'
import { formatMoney } from '../lib/format'

const PAYMENT_METHODS = [
  ['upi', 'UPI'],
  ['cash', 'Cash'],
  ['card', 'Card'],
]

const EMPTY_CUSTOMER = { customer_name: '', phone: '' }

const muted = 'text-sm text-[var(--color-muted)]'

/** "Stock: 5" / "Out of stock" — the same wording in the picker and the bill rows. */
const stockLabel = (stock) => (stock > 0 ? `Stock: ${stock}` : 'Out of stock')

/**
 * The server-priced bill summary for the current rows (POST /preview), so the
 * page never does its own money maths. Re-priced shortly after the rows stop
 * changing; stale responses are aborted.
 */
function useBillPreview(rows, enabled) {
  const payload = useDebounced(JSON.stringify(rows), 300)
  const active = enabled && rows.length > 0
  // The last answer, tagged with the payload it was for — anything else is stale.
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    const items = JSON.parse(payload)
    if (!enabled || items.length === 0) return undefined

    const ctrl = new AbortController()
    api
      .post('/admin/offline-billing/preview', { items }, { signal: ctrl.signal })
      .then((res) => setResult({ key: payload, data: res.data, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setResult({ key: payload, data: null, error: err })
      })

    return () => ctrl.abort()
  }, [payload, enabled])

  if (!active) return { data: null, error: null, loading: false, current: false }

  // Rows changed but the debounce hasn't fired yet → the summary is stale.
  const current = payload === JSON.stringify(rows)
  const answered = result.key === payload
  return {
    data: result.data,
    error: answered ? result.error : null,
    loading: !answered,
    current: current && answered,
  }
}

/**
 * Offline Billing — a walk-in customer buys products at the studio and pays in
 * person. Creates one normal order (source = offline, Paid, Confirmed) through
 * the same pricing and stock deduction as the website; the backend re-checks
 * stock under lock, so the stock shown here is guidance, not the authority.
 */
export default function OfflineBillingPage() {
  const navigate = useNavigate()

  const products = useQuery('/admin/offline-billing/products', { revalidateOnFocus: true })
  const catalogue = useMemo(() => products.data ?? [], [products.data])
  const byId = useMemo(() => new Map(catalogue.map((p) => [p.id, p])), [catalogue])

  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([]) // [{ product_id, quantity }]
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [localErrors, setLocalErrors] = useState({})

  const term = search.trim().toLowerCase()
  const options = term ? catalogue.filter((p) => p.name.toLowerCase().includes(term)) : catalogue

  // Adding a product already on the bill bumps its quantity instead of adding a second row.
  const addProduct = (id) => {
    const product = byId.get(id)
    if (!product || product.stock_quantity <= 0) return
    setRows((current) =>
      current.some((r) => r.product_id === id)
        ? current.map((r) => (r.product_id === id ? { ...r, quantity: r.quantity + 1 } : r))
        : [...current, { product_id: id, quantity: 1 }],
    )
    setLocalErrors((e) => ({ ...e, items: undefined }))
  }

  const setQuantity = (id, value) => {
    const quantity = Math.max(0, Math.floor(Number(value) || 0))
    setRows((current) => current.map((r) => (r.product_id === id ? { ...r, quantity } : r)))
  }

  const removeRow = (id) => setRows((current) => current.filter((r) => r.product_id !== id))

  // Per-row problem with the current (last-loaded) stock, or null.
  const rowProblem = (row) => {
    const product = byId.get(row.product_id)
    if (!product) return 'This product is no longer available.'
    if (product.stock_quantity <= 0) return 'Out of stock'
    if (row.quantity < 1) return 'Enter a quantity of at least 1.'
    if (row.quantity > product.stock_quantity) return `Only ${product.stock_quantity} available.`
    return null
  }
  const rowsValid = rows.length > 0 && rows.every((r) => !rowProblem(r))

  const preview = useBillPreview(rows, rowsValid)
  const previewErrors = preview.error instanceof ApiError ? preview.error.fieldErrors() : {}

  const setCustomerField = (patch) => {
    setCustomer((c) => ({ ...c, ...patch }))
    setLocalErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }))
  }

  const { mutate, pending, fieldErrors } = useMutation(
    () =>
      api.post('/admin/offline-billing', {
        items: rows,
        customer_name: customer.customer_name.trim(),
        phone: customer.phone.trim() || null,
        payment_method: paymentMethod,
      }),
    {
      successMessage: 'Offline bill created.',
      onSuccess: () => navigate('/admin/orders'),
    },
  )

  // Stock may have moved since the list loaded — pull it again after a rejected bill.
  const submit = async () => {
    const res = await mutate()
    if (!res.ok) products.refetch()
  }

  const errorFor = (index, productId) =>
    fieldErrors[`items.${index}.quantity`] ||
    fieldErrors[`items.${index}.product_id`] ||
    previewErrors[`items.${index}.quantity`] ||
    previewErrors[`items.${index}.product_id`] ||
    (rowProblem({ product_id: productId, quantity: rows[index].quantity }) ?? undefined)

  const summaryReady = rowsValid && preview.current && preview.data && !preview.loading

  return (
    <div>
      <PageHeader
        title="Offline Billing"
        description="Bill a walk-in product sale paid at the studio. It is saved as a paid, confirmed offline order in Orders, and the stock is deducted straight away."
      />

      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          const errors = {}
          if (rows.length === 0) errors.items = 'Add at least one product.'
          if (!customer.customer_name.trim()) errors.customer_name = 'Enter the customer’s name.'
          if (!paymentMethod) errors.payment_method = 'Select how the customer paid.'
          setLocalErrors(errors)
          if (Object.keys(errors).length === 0 && summaryReady) submit()
        }}
      >
        <SectionCard title="1 · Products">
          {products.error ? (
            <ErrorState error={products.error} onRetry={products.refetch} />
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SearchInput
                  label="Search products"
                  placeholder="Type a product name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Field label="Product" error={localErrors.items || fieldErrors.items} reserveMessage>
                  <Select
                    value=""
                    disabled={products.loading}
                    onChange={(e) => e.target.value && addProduct(Number(e.target.value))}
                  >
                    <option value="">
                      {products.loading
                        ? 'Loading products…'
                        : options.length === 0
                          ? term
                            ? 'No products match'
                            : 'No active products'
                          : `Add a product (${options.length})`}
                    </option>
                    {options.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} — {formatMoney(p.price)} · {stockLabel(p.stock_quantity)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Search results as tappable rows too — quicker than the dropdown once the list is long. */}
              {term && options.length > 0 && (
                <ul className="max-h-64 divide-y divide-[var(--color-line)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)]">
                  {options.slice(0, 30).map((p) => {
                    const out = p.stock_quantity <= 0
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={out}
                          onClick={() => {
                            addProduct(p.id)
                            // Picked — clear the search, which also closes this list.
                            setSearch('')
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <Thumb src={p.image_url} className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)]" />
                          <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">{p.name}</span>
                          <span className="tabular-nums text-[var(--color-ink-soft)]">{formatMoney(p.price)}</span>
                          {out ? (
                            <Pill tone="danger">Out of stock</Pill>
                          ) : (
                            <span className="w-20 text-right text-xs text-[var(--color-muted)]">
                              {stockLabel(p.stock_quantity)}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {rows.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No products on this bill yet"
                  description="Pick a product from the list or search above. Out-of-stock products can’t be added."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
                  {rows.map((row, index) => {
                    const product = byId.get(row.product_id)
                    const error = errorFor(index, row.product_id)
                    const out = !product || product.stock_quantity <= 0
                    return (
                      <li key={row.product_id} className="flex flex-wrap items-start gap-3 py-3">
                        <Thumb src={product?.image_url} className="h-11 w-11 shrink-0 rounded-[var(--radius-sm)]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--color-ink)]">{product?.name ?? 'Unavailable product'}</p>
                          <p className="text-sm tabular-nums text-[var(--color-ink-soft)]">
                            {product ? formatMoney(product.price) : '—'}
                          </p>
                          {out ? (
                            <Pill tone="danger" className="mt-1">
                              Out of stock
                            </Pill>
                          ) : (
                            <p className="text-xs text-[var(--color-muted)]">{stockLabel(product.stock_quantity)}</p>
                          )}
                        </div>
                        <Field label="Quantity" error={error} className="w-32">
                          <TextInput
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={product?.stock_quantity || undefined}
                            disabled={out}
                            value={row.quantity === 0 ? '' : row.quantity}
                            onChange={(e) => setQuantity(row.product_id, e.target.value)}
                            aria-label={`Quantity of ${product?.name ?? 'product'}`}
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-6"
                          onClick={() => removeRow(row.product_id)}
                          aria-label={`Remove ${product?.name ?? 'product'}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="2 · Customer details" bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            required
            error={localErrors.customer_name || fieldErrors.customer_name}
            reserveMessage
          >
            <TextInput
              value={customer.customer_name}
              maxLength={120}
              onChange={(e) => setCustomerField({ customer_name: e.target.value })}
            />
          </Field>
          <Field label="Phone number" hint="Optional" error={fieldErrors.phone} reserveMessage>
            <TextInput
              type="tel"
              inputMode="tel"
              maxLength={30}
              value={customer.phone}
              onChange={(e) => setCustomerField({ phone: e.target.value })}
            />
          </Field>
        </SectionCard>

        <SectionCard title="3 · Payment">
          <div className="grid gap-5">
            <Field
              label="Payment method"
              required
              error={localErrors.payment_method || fieldErrors.payment_method}
              reserveMessage
              className="max-w-md"
            >
              <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(([value, label]) => (
                  <ChipButton
                    key={value}
                    active={paymentMethod === value}
                    className="min-h-10 justify-center text-sm"
                    onClick={() => {
                      setPaymentMethod(value)
                      setLocalErrors((e) => ({ ...e, payment_method: undefined }))
                    }}
                  >
                    {label}
                  </ChipButton>
                ))}
              </div>
            </Field>

            <div>
              <p className="label">Bill summary</p>
              {rows.length === 0 ? (
                <p className={muted}>Add products to see the bill.</p>
              ) : !rowsValid ? (
                <p className="text-sm text-[var(--color-danger)]">
                  Fix the highlighted products above to see the bill.
                </p>
              ) : preview.error && !(preview.error instanceof ApiError && preview.error.status === 422) ? (
                <ErrorState error={preview.error} />
              ) : preview.error ? (
                <p className="text-sm text-[var(--color-danger)]">
                  {preview.error.message || 'Some products can’t be billed — check the quantities above.'}
                </p>
              ) : !preview.data ? (
                <p className={muted}>Calculating…</p>
              ) : (
                <div className={preview.loading || !preview.current ? 'opacity-60 transition-opacity' : undefined}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-line)] text-left text-xs text-[var(--color-muted)]">
                          <th className="py-2 pr-3 font-medium">Product</th>
                          <th className="py-2 pr-3 text-right font-medium">Qty</th>
                          <th className="py-2 pr-3 text-right font-medium">Unit price</th>
                          <th className="py-2 text-right font-medium">Line total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-line)]">
                        {preview.data.items.map((line) => (
                          <tr key={line.product_id}>
                            <td className="py-2 pr-3 text-[var(--color-ink)]">
                              {line.name}
                              {line.tax_percent > 0 && (
                                <span className="block text-xs text-[var(--color-faint)]">
                                  Incl. {line.tax_percent}% tax ({formatMoney(line.tax_amount)})
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums">{line.quantity}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(line.unit_price)}</td>
                            <td className="py-2 text-right tabular-nums text-[var(--color-ink)]">
                              {formatMoney(line.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <dl className="mt-2 grid gap-1 border-t border-[var(--color-line)] pt-3 text-sm">
                    <div className="flex justify-between gap-3 text-[var(--color-muted)]">
                      <dt>Tax (included in prices)</dt>
                      <dd className="tabular-nums">{formatMoney(preview.data.tax_total)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 text-base font-semibold text-[var(--color-ink)]">
                      <dt>Grand total</dt>
                      <dd className="tabular-nums">{formatMoney(preview.data.total)}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-[var(--color-faint)]">
                    Recorded as <strong>Paid</strong>
                    {paymentMethod && ` by ${PAYMENT_METHODS.find(([v]) => v === paymentMethod)[1]}`} and fulfilment{' '}
                    <strong>Confirmed</strong>. Stock is checked again when the bill is created.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/orders')} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={!summaryReady}>
            Create bill{summaryReady ? ` · ${formatMoney(preview.data.total)}` : ''}
          </Button>
        </div>
      </form>
    </div>
  )
}
