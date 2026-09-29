import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Eye, EyeOff, Info, Plus, Search, X } from 'lucide-react'
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
import { stylistHoursOn } from '../../lib/stylistAvailability'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    <div className="w-full max-w-none">
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
        <WorkingHours
          stylistId={stylist.id}
          dateHours={data.date_hours ?? {}}
          dateClosures={data.date_closures ?? []}
          weeklyHours={data.weekly_hours ?? {}}
          studioHolidays={data.studio_holidays ?? []}
          shop={data.shop_hours}
          canManage={canManage}
          onSaved={refetch}
        />

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
  // First category open, rest closed — user can open any closed one.
  const [collapsed, setCollapsed] = useState(() => {
    const ids = categories.filter((c) => c.gender === tab).map((c) => c.id)
    return new Set(ids.slice(1))
  })

  useEffect(() => {
    const ids = categories.filter((c) => c.gender === tab).map((c) => c.id)
    setCollapsed(new Set(ids.slice(1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, categories.length])

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
            // While searching, expand all matches so results are visible.
            const open = query ? true : !collapsed.has(category.id)

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

/** Hide a range's error until the admin has actually typed something into it. */
function untouchedError(ranges, errors, index) {
  const untouched = !ranges[index]?.start && !ranges[index]?.end
  return untouched ? null : errors[index]
}

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

function WorkingHours({ stylistId, dateHours, dateClosures, weeklyHours, studioHolidays, shop, canManage, onSaved }) {
  const [showHelp, setShowHelp] = useState(false)
  const helpText =
    `Give this professional a standing weekly schedule, a specific calendar date, or both — a date's own hours (and an explicit day off) always come first, otherwise the weekly schedule applies. Nothing is available until you set something.${
      shop
        ? ` Studio hours are ${formatTime12h(shop.opens)} – ${formatTime12h(shop.closes)}, and hours must sit inside that.`
        : ''
    }${
      studioHolidays.length > 0
        ? ` Studio holidays (${studioHolidays.length}) close the whole studio on those dates — see Holidays in the sidebar.`
        : ''
    }`
  return (
    <SectionCard
      title="Working hours"
      actions={
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          aria-label={showHelp ? 'Hide working hours help' : 'Show working hours help'}
          title={showHelp ? 'Hide help' : 'Show help'}
          className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
        >
          {showHelp ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      description={showHelp ? helpText : undefined}
    >
      <CalendarEditor
        stylistId={stylistId}
        dateHours={dateHours}
        dateClosures={dateClosures}
        weeklyHours={weeklyHours}
        studioHolidays={studioHolidays}
        shop={shop}
        canManage={canManage}
        onSaved={onSaved}
      />
    </SectionCard>
  )
}

/* -- Calendar ---------------------------------------------------------------- */

function CalendarEditor({ stylistId, dateHours, dateClosures, weeklyHours, studioHolidays, shop, canManage, onSaved }) {
  const todayIso = studioNow().dateIso
  const maxIso = addDaysIso(todayIso, 399)
  const start = parseDateIso(todayIso)

  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [selectedIso, setSelectedIso] = useState(null)
  const [warnings, setWarnings] = useState([])

  const holidayByDate = useMemo(() => {
    const map = new Map()
    for (const h of studioHolidays ?? []) map.set(h.date, h.name)
    return map
  }, [studioHolidays])

  // What's actually in effect for one date — in order: a studio-wide holiday
  // (whole studio closed), this exact date's own hours, an explicit day off,
  // then the weekly schedule for that weekday.
  const describe = (iso) => {
    const holiday = holidayByDate.get(iso)
    if (holiday) return { kind: 'closed', text: 'Holiday', title: `Studio holiday (${holiday}) — closed for all` }

    const own = dateHours[iso]
    if (own?.length) return { kind: 'custom', text: compactRange(own), title: `Custom hours: ${own.map(formatRange).join(', ')}` }

    if (dateClosures.includes(iso)) return { kind: 'closed', text: 'Off', title: 'Closed — marked not available this date' }

    const weekly = weeklyHours[String(parseDateIso(iso).getDay())]
    if (weekly?.length) return { kind: 'default', text: compactRange(weekly), title: `Usual hours: ${weekly.map(formatRange).join(', ')}` }

    return { kind: 'none', text: '', title: 'Not available — no hours set' }
  }

  const weeklyDays = Object.keys(weeklyHours)
    .map(Number)
    .sort((a, b) => a - b)
    .map((w) => WEEKDAY_SHORT[w])
  const daysSet = Object.values(dateHours).filter((ranges) => ranges.length > 0).length

  const onDayClick = (iso) => {
    if (!canManage) return

    // Single-day selection only: picking another day moves the selection,
    // clicking the same day again clears it.
    setSelectedIso((prev) => (prev === iso ? null : iso))
  }

  const dates = selectedIso ? [selectedIso] : []
  // MonthCalendar expects a Set — keep it to a single entry.
  const selected = useMemo(() => new Set(selectedIso ? [selectedIso] : []), [selectedIso])

  // Shared by both ways of applying hours (the weekly template below, and
  // picking dates by hand): refresh the setup and surface any appointments
  // that no longer fit inside the hours just saved.
  const applyResult = (result) => {
    setWarnings(result?.warnings ?? [])
    onSaved()
  }

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
        {weeklyDays.length > 0 ? (
          <>
            Works every {weeklyDays.join(', ')} — lifelong, no end date
            {daysSet > 0 && <> · plus {daysSet} specific date{daysSet === 1 ? '' : 's'} with their own hours</>}.
          </>
        ) : daysSet === 0 ? (
          'No dates set yet — this professional can’t be booked until you add some. Use Quick setup below for a lifelong weekday / weekend schedule.'
        ) : (
          `Available on ${daysSet} specific date${daysSet === 1 ? '' : 's'} only — not lifelong. Use Quick setup below to set lifelong weekday / weekend hours instead.`
        )}
      </p>

      {canManage && daysSet > 0 && (
        <ClearSpecificDates
          stylistId={stylistId}
          dateHours={dateHours}
          dateClosures={dateClosures}
          hasWeekly={weeklyDays.length > 0}
          onApplied={applyResult}
        />
      )}

      {canManage && (
        <WeeklyTemplate
          stylistId={stylistId}
          dateHours={dateHours}
          weeklyHours={weeklyHours}
          shop={shop}
          onApplied={applyResult}
        />
      )}

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
            Click a day to set the times clients can book for that day only.
          </p>
        ) : (
          <DayEditor
            key={dates.join(',')}
            stylistId={stylistId}
            dates={dates}
            dateHours={dateHours}
            dateClosures={dateClosures}
            weeklyHours={weeklyHours}
            studioHolidays={studioHolidays}
            shop={shop}
            onClear={() => setSelectedIso(null)}
            onApplied={(result) => {
              setSelectedIso(null)
              applyResult(result)
            }}
          />
        )
      ) : null}
    </div>
  )
}

// JS weekday numbers (0 = Sunday … 6 = Saturday, matching Date#getDay()) each
// quick-setup group stands for.
const DAY_GROUPS = [
  { id: 'weekday', title: 'Weekday', hint: 'Mon–Fri', weekdays: [1, 2, 3, 4, 5] },
  { id: 'weekend', title: 'Weekend', hint: 'Sat–Sun', weekdays: [0, 6] },
]

/**
 * Remove every per-date override (custom hours + explicit days off) so only
 * the lifelong weekday/weekend schedule applies. Used to convert a setup like
 * "Available on 294 specific dates" into a lifelong one: set Quick setup first,
 * then clear the leftover dates here.
 */
function ClearSpecificDates({ stylistId, dateHours, dateClosures, hasWeekly, onApplied }) {
  const allDates = [...new Set([...Object.keys(dateHours ?? {}), ...(dateClosures ?? [])])].sort()
  const clearMut = useMutation(
    () =>
      api.put(`/admin/stylists/${stylistId}/date-hours`, {
        days: allDates.map((date) => ({ date, mode: 'clear' })),
      }),
    {
      successMessage: hasWeekly
        ? `Cleared ${allDates.length} specific date${allDates.length === 1 ? '' : 's'} — now lifelong weekly hours only.`
        : `Cleared ${allDates.length} specific date${allDates.length === 1 ? '' : 's'}.`,
    },
  )

  const clear = async () => {
    const res = await clearMut.mutate()
    if (res.ok) onApplied(res.result)
  }

  if (allDates.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] px-3 py-2.5">
      <p className="text-xs text-[var(--color-ink-soft)]">
        {allDates.length} specific date{allDates.length === 1 ? '' : 's'} set individually
        {hasWeekly ? ' — they override the lifelong schedule on those dates' : ''}. Clear them to go
        fully lifelong.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={clear}
        loading={clearMut.pending}
      >
        Clear {allDates.length} specific date{allDates.length === 1 ? '' : 's'}
      </Button>
    </div>
  )
}

/** The saved standing hours for a group, read from its first weekday (every
 *  weekday in a group always carries the same ranges — they're only ever set
 *  together, by this same panel). `[]` when none are saved yet. */
const savedRangesFor = (weeklyHours, group) => weeklyHours[String(group.weekdays[0])] ?? []

/**
 * Give every Monday–Friday one set of standing hours, or every Saturday–
 * Sunday another, in one go — instead of setting five (or two) weekdays by
 * hand. Applies with no end date; switch the tab to do the other group too.
 * Opens already showing what's saved, ready to add to, edit or remove. A
 * specific calendar date, or an explicit day off, still overrides this for
 * that one date (set on the calendar below) — this also offers to clear any
 * such leftover dates on the weekdays being set, so the standing schedule
 * isn't silently shadowed by them.
 */
function WeeklyTemplate({ stylistId, dateHours, weeklyHours, shop, onApplied }) {
  const [open, setOpen] = useState(true)
  const [group, setGroup] = useState('weekday')
  // Seeded once from what's already saved — after that, edited freely like any other form.
  const [weekdayRanges, setWeekdayRanges] = useState(() => savedRangesFor(weeklyHours, DAY_GROUPS[0]).map((r) => ({ ...r })))
  const [weekendRanges, setWeekendRanges] = useState(() => savedRangesFor(weeklyHours, DAY_GROUPS[1]).map((r) => ({ ...r })))
  const [clearShadowed, setClearShadowed] = useState(true)

  const activeGroup = DAY_GROUPS.find((g) => g.id === group)
  const isWeekday = group === 'weekday'
  const ranges = isWeekday ? weekdayRanges : weekendRanges
  const setRanges = isWeekday ? setWeekdayRanges : setWeekendRanges
  const dayWord = isWeekday ? 'weekday' : 'weekend day'

  // Specific dates already set that fall on one of this group's weekdays — they'd
  // keep overriding the standing schedule for just those dates unless cleared too.
  const shadowedDates = Object.keys(dateHours).filter((iso) => activeGroup.weekdays.includes(parseDateIso(iso).getDay()))

  const errors = validateRanges(ranges, shop)
  const given = ranges.length > 0
  const ready = given && Object.keys(errors).length === 0

  const applyMut = useMutation(
    async () => {
      const weekly = await api.put(`/admin/stylists/${stylistId}/weekly-hours`, {
        days: activeGroup.weekdays.map((weekday) => ({ weekday, ranges })),
      })

      if (!clearShadowed || shadowedDates.length === 0) return weekly

      const cleared = await api.put(`/admin/stylists/${stylistId}/date-hours`, {
        days: shadowedDates.map((date) => ({ date, mode: 'clear' })),
      })

      return { ...cleared, warnings: [...weekly.warnings, ...cleared.warnings] }
    },
    {
      successMessage: !ready
        ? undefined
        : clearShadowed && shadowedDates.length > 0
          ? `Every ${dayWord} is now set to ${ranges.map(formatRange).join(', ')}. Cleared ${shadowedDates.length} specific date${shadowedDates.length === 1 ? '' : 's'} that were overriding it.`
          : `Every ${dayWord} is now set to ${ranges.map(formatRange).join(', ')}.`,
    },
  )

  const apply = async () => {
    const res = await applyMut.mutate()
    if (res.ok) onApplied(res.result)
  }

  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-line)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-[var(--color-ink)]">
            Quick setup: weekday &amp; weekend hours
          </span>
          <span className="block text-xs text-[var(--color-muted)]">
            Choose Weekday or Weekend and give it one set of hours — it becomes their standing
            schedule, with no end date.
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn('shrink-0 text-[var(--color-muted)] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-line)] p-4">
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Which days">
            {DAY_GROUPS.map((g) => (
              <ChipButton key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
                {g.title}
                <span className="ml-1.5 opacity-70">({g.hint})</span>
              </ChipButton>
            ))}
          </div>

          <p className="label mb-1.5">{isWeekday ? 'Weekdays (Mon–Fri)' : 'Weekend (Sat–Sun)'}</p>
          <RangeList
            ranges={ranges}
            label={isWeekday ? 'Weekday' : 'Weekend'}
            errorFor={(index) => untouchedError(ranges, errors, index)}
            onChange={setRanges}
          />
          {ranges.length < MAX_RANGES && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRanges([...ranges, blankRange()])}>
              <Plus size={13} /> Add hours
            </Button>
          )}
          {!given && <p className="mt-1 text-xs text-[var(--color-muted)]">Add at least one range of hours.</p>}

          {ready && (
            <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              Sets {ranges.map(formatRange).join(', ')} on every {dayWord}, from now on — replacing
              any standing hours already set for those weekdays. A specific date can still be given
              its own hours, or marked closed, on the calendar below.
            </p>
          )}

          {shadowedDates.length > 0 && (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line)] px-3 py-2.5 text-xs">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                checked={clearShadowed}
                onChange={(e) => setClearShadowed(e.target.checked)}
              />
              <span className="text-[var(--color-ink-soft)]">
                <span className="font-medium text-[var(--color-ink)]">
                  Also clear {shadowedDates.length} specific date{shadowedDates.length === 1 ? '' : 's'}
                </span>{' '}
                already set on {isWeekday ? 'weekdays' : 'the weekend'} — until cleared, those exact
                dates keep overriding the standing schedule with whatever they were set to before.
              </span>
            </label>
          )}

          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={apply} loading={applyMut.pending} disabled={!ready}>
              Set every {dayWord}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const MODE_OPTIONS = [
  { id: 'custom', title: 'Set hours', hint: 'Times clients can book, just for these dates' },
  { id: 'closed', title: 'Closed', hint: 'Not available — overrides an otherwise-open weekly schedule' },
  { id: 'clear', title: 'Follow the weekly schedule', hint: 'No override — use the usual hours for that weekday' },
]

/** Give the selected days their own hours, mark them closed, or hand them back to the weekly schedule. */
function DayEditor({ stylistId, dates, dateHours, dateClosures, weeklyHours, studioHolidays, shop, onClear, onApplied }) {
  const single = dates.length === 1
  const alreadySet = dates.filter((date) => dateHours[date]?.length > 0)
  const holidayForDay = single ? (studioHolidays ?? []).find((h) => h.date === dates[0]) : null

  // Open showing what was actually given for this date: a closed day shows
  // Closed, anything else shows Set hours (with the hours pre-filled below).
  const [mode, setMode] = useState(() =>
    single && !dateHours[dates[0]]?.length && dateClosures.includes(dates[0]) ? 'closed' : 'custom',
  )
  // Pre-fill what the admin can alter: the date's own hours if it has any,
  // otherwise the weekly hours in effect for that weekday (so a weekday-covered
  // day shows its timing ready to edit, add to or remove). Anything else starts empty.
  const weeklyForDay =
    single && !dateHours[dates[0]]?.length
      ? (weeklyHours[String(parseDateIso(dates[0]).getDay())] ?? [])
      : []
  const startedFromWeekly = weeklyForDay.length > 0
  const [ranges, setRanges] = useState(() => {
    if (single && dateHours[dates[0]]?.length) return dateHours[dates[0]].map((r) => ({ ...r }))
    if (startedFromWeekly) return weeklyForDay.map((r) => ({ ...r }))
    return [blankRange()]
  })

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
          : mode === 'closed'
            ? `Marked ${dates.length} day${dates.length === 1 ? '' : 's'} closed.`
            : `${dates.length} day${dates.length === 1 ? '' : 's'} will now follow the weekly schedule.`,
    },
  )

  const apply = async () => {
    const res = await saveMut.mutate()
    if (res.ok) onApplied(res.result)
  }

  // A row the admin hasn't touched yet isn't flagged — Save just stays disabled until it's filled in.
  const errorFor = (index) =>
    untouchedError(ranges, errors, index) ||
    saveMut.fieldErrors[`days.0.ranges.${index}.start`] ||
    saveMut.fieldErrors[`days.0.ranges.${index}.end`]

  const shown = dates.slice(0, 6).map(formatDay).join(', ')

  // What's actually in effect right now for a single selected date, so
  // picking a mode isn't a guess — the same precedence describe() uses.
  const currentlyOn = single
    ? stylistHoursOn({ date_hours: dateHours, date_closures: dateClosures, weekly_hours: weeklyHours }, dates[0], studioHolidays ?? [])
    : null
  const currentLabel = !single
    ? null
    : holidayForDay
      ? `a studio holiday (${holidayForDay.name}) — closed for all`
      : dateHours[dates[0]]?.length
        ? `their own hours (${currentlyOn.map(formatRange).join(', ')})`
        : dateClosures.includes(dates[0])
          ? 'closed'
          : currentlyOn?.length > 0
            ? `the weekly schedule (${currentlyOn.map(formatRange).join(', ')})`
            : 'not available — no hours set'

  return (
    <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">
        {dates.length} day{dates.length === 1 ? '' : 's'} selected
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        {shown}
        {dates.length > 6 && ` and ${dates.length - 6} more`}
      </p>
      {single && <p className="mt-1.5 text-xs text-[var(--color-muted)]">Right now: {currentLabel}.</p>}
      {holidayForDay && (
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          A studio holiday closes the whole studio this date — per-day hours saved here won't apply until the holiday is removed under Holidays.
        </p>
      )}

      <fieldset className="mt-4">
        <legend className="sr-only">What to do with the selected days</legend>
        <div className="grid gap-2 sm:grid-cols-3">
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

      {mode === 'custom' && (
        <div className="mt-4">
          {startedFromWeekly && (
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Showing the weekly hours for this day — alter, add or remove times, then Save to give this date its own hours.
            </p>
          )}          {!single && alreadySet.length > 0 && (
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              {alreadySet.length} of these days already {alreadySet.length === 1 ? 'has' : 'have'} their own hours —
              saving replaces them.
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
          variant={mode === 'closed' ? 'danger' : 'primary'}
          onClick={apply}
          loading={saveMut.pending}
          disabled={invalid}
        >
          {mode === 'custom'
            ? `Save hours for ${dates.length} day${dates.length === 1 ? '' : 's'}`
            : mode === 'closed'
              ? `Mark ${dates.length} day${dates.length === 1 ? '' : 's'} closed`
              : `Follow the weekly schedule for ${dates.length} day${dates.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
