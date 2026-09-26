import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Info, Plus, Search, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import {
  Button,
  ChipButton,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Pill,
  SectionCard,
  TextInput,
  Thumb,
  cn,
} from '../components/ui'
import { formatMoney } from '../lib/format'
import { MonthCalendar } from '../components/MonthCalendar'
import { TimePicker } from '../components/TimePicker'
import { addDaysIso, formatTime12h, parseDateIso, studioNow } from '../../lib/time'
import { formatRange } from '../../lib/workHours'

/**
 * Admin → Stylists → Services & hours (/admin/stylists/:id/setup).
 *
 * Decides what one professional can be booked for, and when:
 *  - the services they offer, picked per gender (Men / Women) and category —
 *    which also decides which genders and categories the booking page shows
 *    for them;
 *  - the calendar dates they can be booked on, and the hours for each (several
 *    ranges per day). Nothing is selected by default: a date with no hours is
 *    simply not available.
 * The public booking page reads exactly this, so nothing here is cosmetic.
 */

// Time ranges one day can hold — keep in step with UpdateStylistDateHoursRequest::MAX_RANGES_PER_DAY.
const MAX_RANGES = 12
const GENDER_TABS = [
  { id: 'male', label: 'Men' },
  { id: 'female', label: 'Women' },
]

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}
const isTime = (v) => /^\d{2}:\d{2}$/.test(v ?? '')

export default function StylistSetupPage() {
  const { id } = useParams()
  // Re-mount when the URL points at another professional.
  return <SetupLoader key={id} id={id} />
}

function SetupLoader({ id }) {
  const { can } = useAuth()
  const canManage = can('stylists.manage')
  const { data, loading, error, refetch } = useQuery(`/admin/stylists/${id}/setup`)
  const [tab, setTab] = useState('male')

  const back = (
    <Link to="/admin/stylists" className="btn btn-outline btn-sm no-underline">
      <ArrowLeft size={14} /> All stylists
    </Link>
  )

  if (loading) {
    return (
      <div>
        <PageHeader title="Services & hours">{back}</PageHeader>
        <LoadingBlock label="Loading…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Services & hours">{back}</PageHeader>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  const { stylist } = data

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Services & hours"
        description="Choose what this professional offers and when they work. The booking page shows clients exactly this — nothing else."
      >
        {back}
      </PageHeader>

      <div className="card mb-5 flex items-center gap-4 p-4">
        <Thumb
          src={stylist.image_url}
          alt=""
          iconSize={18}
          className="h-14 w-14 shrink-0 rounded-full border border-[var(--color-line)]"
        />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-lg font-semibold text-[var(--color-ink)]">{stylist.name}</span>
            {!stylist.status && <Pill tone="neutral">Hidden from site</Pill>}
          </p>
          <p className="line-clamp-2 text-sm text-[var(--color-muted)]">{stylist.bio || 'No bio added yet'}</p>
        </div>
      </div>

      {!canManage && (
        <p className="mb-5 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-ink-soft)]">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          You can view this setup but not change it.
        </p>
      )}

      <div className="flex flex-col gap-5">
        <ServicesEditor
          key={`s-${[...data.service_ids].sort((a, b) => a - b).join(',')}-${JSON.stringify(data.service_terms ?? {})}`}
          stylistId={stylist.id}
          categories={data.categories}
          savedIds={data.service_ids}
          savedTerms={data.service_terms ?? {}}
          canManage={canManage}
          tab={tab}
          setTab={setTab}
          onSaved={refetch}
        />

        <WorkingHours
          stylistId={stylist.id}
          dateHours={data.date_hours ?? {}}
          shop={data.shop_hours}
          canManage={canManage}
          onSaved={refetch}
        />
      </div>
    </div>
  )
}

/* -- Services ---------------------------------------------------------------- */

/** Saved terms { "30": { price: 1200, advance_percentage: 25 } } → form inputs (blank string = the standard). */
function termsToInputs(saved) {
  const out = {}
  for (const [id, t] of Object.entries(saved ?? {})) {
    out[id] = {
      price: t.price != null ? String(t.price) : '',
      advance: t.advance_percentage != null ? String(t.advance_percentage) : '',
    }
  }
  return out
}

const parseNum = (v) => (String(v ?? '').trim() === '' ? null : Number(v))

/** A comparable signature of "which services, at which terms" — used to tell if anything changed. */
const termsSignature = (ids, inputs) =>
  [...ids]
    .sort((a, b) => a - b)
    .map((id) => `${id}:${parseNum(inputs[id]?.price) ?? ''}:${parseNum(inputs[id]?.advance) ?? ''}`)
    .join('|')

function termError(value) {
  const price = parseNum(value?.price)
  const percentage = parseNum(value?.advance)

  if (price !== null && (Number.isNaN(price) || price < 0)) return 'Enter a price of 0 or more.'
  if (percentage !== null && (Number.isNaN(percentage) || !Number.isInteger(percentage) || percentage < 0 || percentage > 100)) {
    return 'Advance must be a whole number from 0 to 100.'
  }
  return null
}

/**
 * This professional's own price and advance-to-confirm % for one ticked service.
 * Blank fields use the service's standard (shown as the placeholder).
 */
function ServiceTerms({ service, value, onChange, error, disabled }) {
  const price = parseNum(value?.price)
  const percentage = parseNum(value?.advance)
  const custom = price !== null || percentage !== null

  const effectivePrice = price ?? service.price
  const effectivePercentage = percentage ?? service.advance_percentage ?? 0
  const advance = effectivePrice != null && !error ? Math.round(effectivePrice * effectivePercentage) / 100 : null

  let summary
  if (error) summary = null
  else if (effectivePrice == null) summary = 'No price set — clients will see no price.'
  else if (effectivePercentage === 0) summary = `Clients pay ${formatMoney(effectivePrice)} · no advance needed.`
  else summary = `Clients pay ${formatMoney(effectivePrice)} · ${effectivePercentage}% (${formatMoney(advance)}) advance to confirm.`

  return (
    <div className="bg-[var(--color-surface-sunken)] px-3 pb-3 pl-10 pt-2">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="w-32">
          <label className="label" htmlFor={`terms-price-${service.id}`}>
            Price (₹)
          </label>
          <TextInput
            id={`terms-price-${service.id}`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder={service.price != null ? String(service.price) : 'Standard'}
            value={value?.price ?? ''}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange({ price: e.target.value })}
          />
        </div>
        <div className="w-36">
          <label className="label" htmlFor={`terms-advance-${service.id}`}>
            Advance to confirm (%)
          </label>
          <TextInput
            id={`terms-advance-${service.id}`}
            type="number"
            min="0"
            max="100"
            step="1"
            inputMode="numeric"
            placeholder={String(service.advance_percentage ?? 0)}
            value={value?.advance ?? ''}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange({ advance: e.target.value })}
          />
        </div>
        <p className="min-w-[12rem] flex-1 pb-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
          {custom ? <Pill tone="info" className="mr-1.5">Their own terms</Pill> : null}
          {summary}
          {!custom && !error && ' (standard — type a value to change it for this professional)'}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

function ServicesEditor({ stylistId, categories, savedIds, savedTerms, canManage, tab, setTab, onSaved }) {
  const savedInputs = useMemo(() => termsToInputs(savedTerms), [savedTerms])
  const [selected, setSelected] = useState(() => new Set(savedIds))
  const [terms, setTerms] = useState(savedInputs)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())

  const genderOf = useMemo(() => {
    const map = new Map()
    for (const category of categories) for (const service of category.services) map.set(service.id, category.gender)
    return map
  }, [categories])

  const countFor = (gender) => [...selected].filter((sid) => genderOf.get(sid) === gender).length
  const dirty = termsSignature(selected, terms) !== termsSignature(savedIds, savedInputs)
  const setTerm = (sid, patch) => setTerms((prev) => ({ ...prev, [sid]: { ...prev[sid], ...patch } }))
  const orderedIds = [...selected]
  const rowError = (sid) => {
    const index = orderedIds.indexOf(sid)
    return (
      termError(terms[sid]) ||
      saveMut.fieldErrors[`services.${index}.price`] ||
      saveMut.fieldErrors[`services.${index}.advance_percentage`]
    )
  }
  const hasTermErrors = orderedIds.some((sid) => termError(terms[sid]))

  const query = search.trim().toLowerCase()
  const visibleCategories = categories
    .filter((c) => c.gender === tab)
    .map((c) => ({
      ...c,
      services: query ? c.services.filter((s) => s.name.toLowerCase().includes(query)) : c.services,
    }))
    .filter((c) => c.services.length > 0)

  const saveMut = useMutation(
    () =>
      api.put(`/admin/stylists/${stylistId}/services`, {
        services: [...selected].map((id) => ({
          id,
          price: parseNum(terms[id]?.price),
          advance_percentage: parseNum(terms[id]?.advance),
        })),
      }),
    { successMessage: 'Services saved.', onSuccess: onSaved },
  )

  const toggleService = (sid) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })

  const setMany = (ids, on) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const sid of ids) {
        if (on) next.add(sid)
        else next.delete(sid)
      }
      return next
    })

  const tabIds = categories.filter((c) => c.gender === tab).flatMap((c) => c.services.map((s) => s.id))
  const servesLabel = GENDER_TABS.filter((t) => countFor(t.id) > 0).map((t) => t.label)

  return (
    <SectionCard
      title="Services they offer"
      description="Pick Men or Women, then tick the services this professional does. Set their own price and advance % where it differs from the standard — clients see exactly this when they book."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Who the services are for">
        {GENDER_TABS.map((t) => (
          <ChipButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-70">{countFor(t.id)} ticked</span>
          </ChipButton>
        ))}
        <span className="ml-1 text-xs text-[var(--color-muted)]">
          {servesLabel.length > 0 ? `Serves: ${servesLabel.join(' and ')}` : 'Not serving anyone yet'}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
          />
          <TextInput
            type="search"
            aria-label="Search services"
            placeholder={`Search ${tab === 'male' ? "men's" : "women's"} services`}
            className="!pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={() => setMany(tabIds, true)}>
              Tick all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMany(tabIds, false)}>
              Clear
            </Button>
          </>
        )}
      </div>

      {visibleCategories.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          {query ? 'No services match your search.' : `No ${tab === 'male' ? "men's" : "women's"} services exist yet. Add them under Catalogue → ${tab === 'male' ? 'Male' : 'Female'} Services.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleCategories.map((category) => {
            const ids = category.services.map((s) => s.id)
            const ticked = ids.filter((sid) => selected.has(sid)).length
            const open = !collapsed.has(category.id)

            return (
              <li key={category.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)]">
                <div className="flex items-center gap-3 bg-[var(--color-surface-sunken)] px-3 py-2.5">
                  <TriCheckbox
                    checked={ticked === ids.length}
                    indeterminate={ticked > 0 && ticked < ids.length}
                    disabled={!canManage}
                    label={`Select all in ${category.name}`}
                    onChange={(on) => setMany(ids, on)}
                  />
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev)
                        if (next.has(category.id)) next.delete(category.id)
                        else next.add(category.id)
                        return next
                      })
                    }
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                        {category.name}
                        {!category.status && (
                          <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">(inactive)</span>
                        )}
                      </span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        {ticked} of {ids.length} ticked
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={cn('shrink-0 text-[var(--color-muted)] transition-transform', open && 'rotate-180')}
                    />
                  </button>
                </div>

                {open && (
                  <ul className="divide-y divide-[var(--color-line)]">
                    {category.services.map((service) => (
                      <li key={service.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface-hover)]">
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                            checked={selected.has(service.id)}
                            disabled={!canManage}
                            onChange={() => toggleService(service.id)}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)]">
                            {service.name}
                          </span>
                          {!service.status && <Pill tone="neutral">Inactive</Pill>}
                          <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">
                            {[service.duration_minutes ? `${service.duration_minutes} min` : null, service.price != null ? `standard ${formatMoney(service.price)}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </label>
                        {selected.has(service.id) && (
                          <ServiceTerms
                            service={service}
                            value={terms[service.id]}
                            error={rowError(service.id)}
                            disabled={!canManage}
                            onChange={(patch) => setTerm(service.id, patch)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canManage && (
        <SaveBar
          summary={`${selected.size} service${selected.size === 1 ? '' : 's'} ticked`}
          dirty={dirty}
          pending={saveMut.pending}
          onSave={() => saveMut.mutate()}
          saveDisabled={hasTermErrors}
          onReset={() => {
            setSelected(new Set(savedIds))
            setTerms(savedInputs)
          }}
          saveLabel="Save services"
        />
      )}
    </SectionCard>
  )
}

/** A checkbox that can show the "some but not all" state. */
function TriCheckbox({ checked, indeterminate, disabled, label, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate)
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      title={label}
      className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}

function SaveBar({ summary, dirty, pending, onSave, onReset, saveLabel, saveDisabled = false }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
      <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        {summary}
        {dirty && <Pill tone="warn">Unsaved changes</Pill>}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!dirty || pending}>
          Reset
        </Button>
        <Button size="sm" onClick={onSave} loading={pending} disabled={!dirty || saveDisabled}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

/* -- Working hours ----------------------------------------------------------- */

/** Client-side checks for one day's ranges (mirroring the server's), keyed by range index. */
function validateRanges(ranges, shop) {
  const errors = {}
  const open = shop ? toMinutes(shop.opens) : null
  const close = shop ? toMinutes(shop.closes) : null

  ranges.forEach((range, index) => {
    if (!isTime(range.start) || !isTime(range.end)) errors[index] = 'Enter both a start and an end time.'
  })

  const ordered = ranges
    .map((range, index) => ({ ...range, index }))
    .filter((r) => isTime(r.start) && isTime(r.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))

  let previousEnd = null
  for (const range of ordered) {
    const start = toMinutes(range.start)
    const end = toMinutes(range.end)

    if (end <= start) errors[range.index] = 'The end time must be after the start time.'
    else if (previousEnd !== null && start < previousEnd) errors[range.index] = 'This overlaps another range on the same day.'
    else if (open !== null && (start < open || end > close)) {
      errors[range.index] = `Studio hours are ${formatTime12h(shop.opens)} – ${formatTime12h(shop.closes)}.`
    } else previousEnd = end
  }

  return errors
}

/** A new range starts empty: nothing is filled in for the admin — they give the times. */
const blankRange = () => ({ start: '', end: '' })

/** "10:00" → "10a", "19:30" → "7:30p" — short enough for a calendar cell. */
function compactTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'a' : 'p'}`
}
const compactRange = (ranges) => `${compactTime(ranges[0].start)}–${compactTime(ranges[ranges.length - 1].end)}`

const shortDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const formatDay = (iso) => shortDate.format(parseDateIso(iso))

/** The start/end time inputs for a list of ranges (one row each) with a remove button. */
function RangeList({ ranges, onChange, label, errorFor, disabled }) {
  return (
    <ul className="flex flex-col gap-2">
      {ranges.map((range, index) => {
        const message = errorFor(index)

        return (
          <li key={index}>
            <div className="flex flex-wrap items-center gap-2">
              {/* The field style is full-width, so the width lives on a wrapper. */}
              <div className="w-32 shrink-0 sm:w-40">
                <TimePicker
                  label={`${label} range ${index + 1} start`}
                  value={range.start}
                  disabled={disabled}
                  invalid={Boolean(message)}
                  onChange={(start) => onChange(ranges.map((r, i) => (i === index ? { ...r, start } : r)))}
                />
              </div>
              <span className="text-sm text-[var(--color-muted)]">to</span>
              <div className="w-32 shrink-0 sm:w-40">
                <TimePicker
                  label={`${label} range ${index + 1} end`}
                  value={range.end}
                  disabled={disabled}
                  invalid={Boolean(message)}
                  onChange={(end) => onChange(ranges.map((r, i) => (i === index ? { ...r, end } : r)))}
                />
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${label} range ${index + 1}`}
                  title="Remove"
                  onClick={() => onChange(ranges.filter((_, i) => i !== index))}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            {message && (
              <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
                {message}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function WorkingHours({ stylistId, dateHours, shop, canManage, onSaved }) {
  return (
    <SectionCard
      title="Working hours"
      description={
        `Pick the dates this professional can be booked on, then give each the times. Nothing is available until you set it — the booking page shows exactly these dates and times.${
          shop
            ? ` Studio hours are ${formatTime12h(shop.opens)} – ${formatTime12h(shop.closes)}, and hours must sit inside that.`
            : ''
        }`
      }
    >
      <CalendarEditor
        stylistId={stylistId}
        dateHours={dateHours}
        shop={shop}
        canManage={canManage}
        onSaved={onSaved}
      />
    </SectionCard>
  )
}

/* -- Calendar ---------------------------------------------------------------- */

function CalendarEditor({ stylistId, dateHours, shop, canManage, onSaved }) {
  const todayIso = studioNow().dateIso
  const maxIso = addDaysIso(todayIso, 399)
  const start = parseDateIso(todayIso)

  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [selected, setSelected] = useState(() => new Set())
  const [anchor, setAnchor] = useState(null)
  const [warnings, setWarnings] = useState([])

  // A date is only "on" when it has hours; every other date is simply not available.
  const describe = (iso) => {
    const own = dateHours[iso]
    return own?.length
      ? { kind: 'custom', text: compactRange(own), title: `Available: ${own.map(formatRange).join(', ')}` }
      : { kind: 'none', text: '', title: 'Not available — no hours set' }
  }

  const daysSet = Object.values(dateHours).filter((ranges) => ranges.length > 0).length

  const onDayClick = (iso, { shift }) => {
    if (!canManage) return

    setSelected((prev) => {
      const next = new Set(prev)

      if (shift && anchor) {
        const [from, to] = anchor <= iso ? [anchor, iso] : [iso, anchor]
        for (let d = from; d <= to; d = addDaysIso(d, 1)) if (d >= todayIso && d <= maxIso) next.add(d)
      } else if (next.has(iso)) {
        next.delete(iso)
      } else {
        next.add(iso)
      }

      return next
    })
    setAnchor(iso)
  }

  const dates = [...selected].sort()

  return (
    <div>
      {warnings.length > 0 && (
        <div
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--color-warn)_40%,transparent)] bg-[var(--color-warn-tint)] px-3.5 py-3 text-sm text-[var(--color-ink)]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">Some existing appointments now fall outside their hours</p>
            <button
              type="button"
              className="shrink-0 text-xs text-[var(--color-muted)] underline"
              onClick={() => setWarnings([])}
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-1.5 list-disc pl-5 text-[var(--color-ink-soft)]">
            {warnings.map((w) => (
              <li key={w.date}>
                {formatDay(w.date)} — {w.count} appointment{w.count === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
            Nothing was cancelled. Review them under Appointments.
          </p>
        </div>
      )}

      <p className="mb-3 text-sm text-[var(--color-ink-soft)]" data-testid="days-set">
        {daysSet === 0
          ? 'No dates set yet — this professional can’t be booked until you add some.'
          : `Available on ${daysSet} upcoming day${daysSet === 1 ? '' : 's'}.`}
      </p>

      <MonthCalendar
        year={view.year}
        month={view.month}
        onMonthChange={(year, month) => setView({ year, month })}
        minIso={todayIso}
        maxIso={maxIso}
        todayIso={todayIso}
        selected={selected}
        onDayClick={onDayClick}
        describe={describe}
      />

      {canManage ? (
        dates.length === 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Click a day to set the times clients can book. Click several days — or Shift-click to pick a
            range — to give them the same hours.
          </p>
        ) : (
          <DayEditor
            key={dates.join(',')}
            stylistId={stylistId}
            dates={dates}
            dateHours={dateHours}
            shop={shop}
            onClear={() => setSelected(new Set())}
            onApplied={(result) => {
              setSelected(new Set())
              setWarnings(result?.warnings ?? [])
              onSaved()
            }}
          />
        )
      ) : null}
    </div>
  )
}

const MODE_OPTIONS = [
  { id: 'custom', title: 'Set hours', hint: 'Times clients can book' },
  { id: 'clear', title: 'Remove hours', hint: 'Not available on these days' },
]

/** Give the selected days their hours — or, for days that have some, take them away again. */
function DayEditor({ stylistId, dates, dateHours, shop, onClear, onApplied }) {
  const single = dates.length === 1
  const alreadySet = dates.filter((date) => dateHours[date]?.length > 0)

  const [mode, setMode] = useState('custom')
  // Nothing is pre-filled: a day that already has hours shows them; anything else starts empty.
  const [ranges, setRanges] = useState(() =>
    single && dateHours[dates[0]]?.length ? dateHours[dates[0]].map((r) => ({ ...r })) : [blankRange()],
  )

  const errors = mode === 'custom' ? validateRanges(ranges, shop) : {}
  const invalid = mode === 'custom' && (ranges.length === 0 || Object.keys(errors).length > 0)

  const saveMut = useMutation(
    () =>
      api.put(`/admin/stylists/${stylistId}/date-hours`, {
        days: dates.map((date) => ({ date, mode, ranges: mode === 'custom' ? ranges : [] })),
      }),
    {
      successMessage:
        mode === 'custom'
          ? `Saved hours for ${dates.length} day${dates.length === 1 ? '' : 's'}.`
          : `Removed hours from ${dates.length} day${dates.length === 1 ? '' : 's'}.`,
    },
  )

  const apply = async () => {
    const res = await saveMut.mutate()
    if (res.ok) onApplied(res.result)
  }

  // A row the admin hasn't touched yet isn't flagged — Save just stays disabled until it's filled in.
  const errorFor = (index) => {
    const untouched = !ranges[index]?.start && !ranges[index]?.end

    return (
      (untouched ? null : errors[index]) ||
      saveMut.fieldErrors[`days.0.ranges.${index}.start`] ||
      saveMut.fieldErrors[`days.0.ranges.${index}.end`]
    )
  }

  const shown = dates.slice(0, 6).map(formatDay).join(', ')

  return (
    <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">
        {dates.length} day{dates.length === 1 ? '' : 's'} selected
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        {shown}
        {dates.length > 6 && ` and ${dates.length - 6} more`}
      </p>

      {/* Removing only makes sense when at least one selected day has hours to remove. */}
      {alreadySet.length > 0 && (
        <fieldset className="mt-4">
          <legend className="sr-only">What to do with the selected days</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors',
                  mode === option.id
                    ? 'border-[var(--color-ink)] bg-[var(--color-surface-sunken)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                )}
              >
                <input
                  type="radio"
                  name="day-mode"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                  checked={mode === option.id}
                  onChange={() => setMode(option.id)}
                />
                <span>
                  <span className="block text-sm font-medium text-[var(--color-ink)]">{option.title}</span>
                  <span className="block text-xs text-[var(--color-muted)]">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {mode === 'custom' && (
        <div className="mt-4">
          {!single && alreadySet.length > 0 && (
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              {alreadySet.length} of these days already {alreadySet.length === 1 ? 'has' : 'have'} hours — saving
              replaces them.
            </p>
          )}
          <RangeList ranges={ranges} label="Selected days" errorFor={errorFor} onChange={setRanges} />
          {ranges.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Add at least one range of hours.</p>
          )}
          {ranges.length < MAX_RANGES ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRanges([...ranges, blankRange()])}>
              <Plus size={13} /> Add hours
            </Button>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              A day can hold up to {MAX_RANGES} time ranges. To add more, join back-to-back ranges — for example
              10:00–11:00 and 11:00–12:00 become 10:00–12:00.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-line)] pt-4">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={saveMut.pending}>
          Clear selection
        </Button>
        <Button
          size="sm"
          variant={mode === 'clear' ? 'danger' : 'primary'}
          onClick={apply}
          loading={saveMut.pending}
          disabled={invalid}
        >
          {mode === 'custom'
            ? `Save hours for ${dates.length} day${dates.length === 1 ? '' : 's'}`
            : `Remove hours from ${dates.length} day${dates.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
