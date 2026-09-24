const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatPrice = (value) =>
  value === null || value === undefined || value === '' ? '—' : inr.format(Number(value))

const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** ₹ with paise only when present — product/combo prices and taxes can be fractional. */
export const formatMoney = (value) =>
  value === null || value === undefined || value === '' ? '—' : inrPaise.format(Number(value))

export const formatDuration = (min) => {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—')
export const formatDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : '—')

export const formatTime = (hhmm) => {
  if (!hhmm) return '—'
  const [h, m] = String(hhmm).split(':')
  const hour = Number(h)
  const suffix = hour >= 12 ? 'pm' : 'am'
  const h12 = hour % 12 || 12
  return `${h12}:${m ?? '00'} ${suffix}`
}

export const relativeTime = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(iso)
}

export const titleCase = (s) =>
  String(s || '')
    .replace(/[-_.]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

export const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
