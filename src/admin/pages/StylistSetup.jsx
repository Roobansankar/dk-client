import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Copy, Info, Plus, Search, X } from 'lucide-react'
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
  Toggle,
  cn,
} from '../components/ui'
import { formatMoney } from '../lib/format'
import { MonthCalendar } from '../components/MonthCalendar'
import { addDaysIso, formatTime12h, parseDateIso, studioNow } from '../../lib/time'
import { DAY_NAMES_LONG, DISPLAY_ORDER, describeWeek, formatRange } from '../../lib/workHours'

/**
 * Admin → Stylists → Services & hours (/admin/stylists/:id/setup).
 *
 * Decides what one professional can be booked for, and when:
 *  - the services they offer, picked per gender (Men / Women) and category —
 *    which also decides which genders and categories the booking page shows
 *    for them;
 *  - their weekly working hours (several ranges per day; no range = day off).
 * The public booking page reads exactly this, so nothing here is cosmetic.
 */

const MAX_RANGES = 4
const GENDER_TABS = [
  { id: 'male', label: 'Men' },
  { id: 'female', label: 'Women' },
]

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}
const isTime = (v) => /^\d{2}:\d{2}$/.test(v ?? '')

/** The ranges a day gets when it is switched on: the studio's hours around a 1–2 PM break. */
function defaultRanges(shop) {
  const open = shop?.opens ?? '10:00'
  const close = shop?.closes ?? '19:30'
  const [breakStart, breakEnd] = ['13:00', '14:00']

  return toMinutes(open) < toMinutes(breakStart) && toMinutes(breakEnd) < toMinutes(close)
    ? [
        { start: open, end: breakStart },
        { start: breakEnd, end: close },
      ]
    : [{ start: open, end: close }]
}

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
          key={`s-${[...data.service_ids].sort((a, b) => a - b).join(',')}`}
          stylistId={stylist.id}
          categories={data.categories}
          savedIds={data.service_ids}
          canManage={canManage}
          tab={tab}
          setTab={setTab}
          onSaved={refetch}
        />

        <WorkingHours
          stylistId={stylist.id}
          savedWeek={data.work_hours}
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

function ServicesEditor({ stylistId, categories, savedIds, canManage, tab, setTab, onSaved }) {
  const [selected, setSelected] = useState(() => new Set(savedIds))
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())

  const genderOf = useMemo(() => {
    const map = new Map()
    for (const category of categories) for (const service of category.services) map.set(service.id, category.gender)
    return map
  }, [categories])

  const countFor = (gender) => [...selected].filter((sid) => genderOf.get(sid) === gender).length
  const dirty = selected.size !== savedIds.length || savedIds.some((sid) => !selected.has(sid))

  const query = search.trim().toLowerCase()
  const visibleCategories = categories
    .filter((c) => c.gender === tab)
    .map((c) => ({
      ...c,
      services: query ? c.services.filter((s) => s.name.toLowerCase().includes(query)) : c.services,
    }))
    .filter((c) => c.services.length > 0)

  const saveMut = useMutation(
    () => api.put(`/admin/stylists/${stylistId}/services`, { service_ids: [...selected] }),
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
      description="Pick Men or Women, then tick the services this professional does. Clients only see what is ticked."
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
                            {[service.duration_minutes ? `${service.duration_minutes} min` : null, service.price != null ? formatMoney(service.price) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </label>
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
          onReset={() => setSelected(new Set(savedIds))}
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

/** The same checks across a whole week, keyed `${weekday}.${rangeIndex}`. */
function validateWeek(week, shop) {
  const errors = {}
  week.forEach((ranges, day) => {
    for (const [index, message] of Object.entries(validateRanges(ranges, shop))) errors[`${day}.${index}`] = message
  })
  return errors
}

/** A new range starts where the last one ended and runs to closing time. */
const addRange = (ranges, shop) => [
  ...ranges,
  { start: ranges[ranges.length - 1]?.end ?? '', end: shop?.closes ?? '' },
]

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
              <div className="w-28 shrink-0 sm:w-36">
                <TextInput
                  type="time"
                  aria-label={`${label} range ${index + 1} start`}
                  value={range.start}
                  disabled={disabled}
                  aria-invalid={Boolean(message)}
                  onChange={(e) => onChange(ranges.map((r, i) => (i === index ? { ...r, start: e.target.value } : r)))}
                />
              </div>
              <span className="text-sm text-[var(--color-muted)]">to</span>
              <div className="w-28 shrink-0 sm:w-36">
                <TextInput
                  type="time"
                  aria-label={`${label} range ${index + 1} end`}
                  value={range.end}
                  disabled={disabled}
                  aria-invalid={Boolean(message)}
                  onChange={(e) => onChange(ranges.map((r, i) => (i === index ? { ...r, end: e.target.value } : r)))}
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

function WorkingHours({ stylistId, savedWeek, dateHours, shop, canManage, onSaved }) {
  const [tab, setTab] = useState('calendar')

  return (
    <SectionCard
      title="Working hours"
      description={
        shop
          ? `Pick days on the calendar to set that date's hours, or edit the regular weekly pattern. Studio hours are ${formatTime12h(shop.opens)} – ${formatTime12h(shop.closes)}, and hours must sit inside that.`
          : "Pick days on the calendar to set that date's hours, or edit the regular weekly pattern."
      }
    >
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="How to set working hours">
        <ChipButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
          Calendar
        </ChipButton>
        <ChipButton active={tab === 'weekly'} onClick={() => setTab('weekly')}>
          Weekly pattern
        </ChipButton>
      </div>

      {tab === 'calendar' ? (
        <CalendarEditor
          stylistId={stylistId}
          savedWeek={savedWeek}
          dateHours={dateHours}
          shop={shop}
          canManage={canManage}
          onSaved={onSaved}
        />
      ) : (
        <WeeklyEditor
          key={JSON.stringify(savedWeek)}
          stylistId={stylistId}
          savedWeek={savedWeek}
          shop={shop}
          canManage={canManage}
          onSaved={onSaved}
        />
      )}
    </SectionCard>
  )
}

/* -- Calendar ---------------------------------------------------------------- */

function CalendarEditor({ stylistId, savedWeek, dateHours, shop, canManage, onSaved }) {
  const todayIso = studioNow().dateIso
  const maxIso = addDaysIso(todayIso, 399)
  const start = parseDateIso(todayIso)

  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [selected, setSelected] = useState(() => new Set())
  const [anchor, setAnchor] = useState(null)
  const [warnings, setWarnings] = useState([])

  const describe = (iso) => {
    const own = dateHours[iso]
    if (own !== undefined) {
      return own.length === 0
        ? { kind: 'off', text: 'Day off', title: 'Day off' }
        : { kind: 'custom', text: compactRange(own), title: `Custom hours: ${own.map(formatRange).join(', ')}` }
    }
    const weekly = savedWeek[parseDateIso(iso).getDay()] ?? []
    return weekly.length === 0
      ? { kind: 'weekly-off', text: 'Off', title: 'Day off (weekly pattern)' }
      : { kind: 'regular', text: compactRange(weekly), title: `Regular hours: ${weekly.map(formatRange).join(', ')}` }
  }

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
            Click a day to set its hours. Click several days — or Shift-click to pick a range — to change
            them together, for example a holiday.
          </p>
        ) : (
          <DayEditor
            key={dates.join(',')}
            stylistId={stylistId}
            dates={dates}
            describe={describe}
            savedWeek={savedWeek}
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
  { id: 'regular', title: 'Regular hours', hint: 'Follow the weekly pattern' },
  { id: 'off', title: 'Day off', hint: 'Not available to book' },
  { id: 'custom', title: 'Custom hours', hint: 'Set the times for these days' },
]

/** What to do with the selected days: regular hours, a day off, or custom hours. */
function DayEditor({ stylistId, dates, describe, savedWeek, dateHours, shop, onClear, onApplied }) {
  const single = dates.length === 1
  const current = single ? describe(dates[0]) : null

  const [mode, setMode] = useState(single ? (current.kind === 'custom' ? 'custom' : current.kind === 'off' ? 'off' : 'regular') : 'off')
  const [ranges, setRanges] = useState(() => {
    if (single) {
      const own = dateHours[dates[0]]
      if (own?.length) return own.map((r) => ({ ...r }))
      const weekly = savedWeek[parseDateIso(dates[0]).getDay()]
      if (weekly?.length) return weekly.map((r) => ({ ...r }))
    }
    return defaultRanges(shop)
  })

  const errors = mode === 'custom' ? validateRanges(ranges, shop) : {}
  const invalid = mode === 'custom' && (ranges.length === 0 || Object.keys(errors).length > 0)

  const saveMut = useMutation(
    () =>
      api.put(`/admin/stylists/${stylistId}/date-hours`, {
        days: dates.map((date) => ({ date, mode, ranges: mode === 'custom' ? ranges : [] })),
      }),
    { successMessage: `Saved ${dates.length} day${dates.length === 1 ? '' : 's'}.` },
  )

  const apply = async () => {
    const res = await saveMut.mutate()
    if (res.ok) onApplied(res.result)
  }

  const errorFor = (index) =>
    errors[index] ||
    saveMut.fieldErrors[`days.0.ranges.${index}.start`] ||
    saveMut.fieldErrors[`days.0.ranges.${index}.end`]

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

      <fieldset className="mt-4">
        <legend className="sr-only">Hours for the selected days</legend>
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
          <RangeList
            ranges={ranges}
            label="Selected days"
            errorFor={errorFor}
            onChange={setRanges}
          />
          {ranges.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Add at least one range of hours.</p>
          )}
          {ranges.length < MAX_RANGES && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRanges(addRange(ranges, shop))}>
              <Plus size={13} /> Add hours
            </Button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-line)] pt-4">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={saveMut.pending}>
          Clear selection
        </Button>
        <Button size="sm" onClick={apply} loading={saveMut.pending} disabled={invalid}>
          Apply to {dates.length} day{dates.length === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  )
}

/* -- Weekly pattern ---------------------------------------------------------- */

function WeeklyEditor({ stylistId, savedWeek, shop, canManage, onSaved }) {
  const clone = (week) => week.map((day) => day.map((r) => ({ ...r })))
  const [week, setWeek] = useState(() => clone(savedWeek))

  const dirty = JSON.stringify(week) !== JSON.stringify(savedWeek)
  const clientErrors = useMemo(() => validateWeek(week, shop), [week, shop])

  const saveMut = useMutation(
    () =>
      api.put(`/admin/stylists/${stylistId}/work-hours`, {
        days: week.map((ranges, day) => ({ day_of_week: day, ranges })),
      }),
    { successMessage: 'Weekly hours saved.', onSuccess: onSaved },
  )

  const errorFor = (day) => (index) =>
    clientErrors[`${day}.${index}`] ||
    saveMut.fieldErrors[`days.${day}.ranges.${index}.start`] ||
    saveMut.fieldErrors[`days.${day}.ranges.${index}.end`]

  const setDay = (day, ranges) => setWeek((prev) => prev.map((r, d) => (d === day ? ranges : r)))

  const summary = describeWeek(week)
  const workingDays = week.filter((day) => day.length > 0).length

  return (
    <div>
      <p className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
        <span className="font-medium text-[var(--color-ink)]">The regular week: </span>
        {workingDays === 0
          ? 'No weekly hours. Set dates on the calendar instead, or add hours here.'
          : summary.map((group, i) => (
              <span key={group.label}>
                {i > 0 && ' · '}
                {group.label} {group.off ? 'off' : group.text}
              </span>
            ))}
        <span className="mt-1 block text-[var(--color-muted)]">
          This repeats every week. A date set on the calendar replaces it for that day.
        </span>
      </p>

      <ul>
        {DISPLAY_ORDER.map((day) => {
          const ranges = week[day]
          const working = ranges.length > 0

          return (
            <li
              key={day}
              className="flex flex-col gap-2 border-b border-[var(--color-line)] py-3 first:pt-0 last:border-0 sm:flex-row sm:items-start sm:gap-6"
            >
              <div className="flex shrink-0 items-center sm:w-40 sm:pt-1.5">
                <Toggle
                  id={`day-${day}`}
                  checked={working}
                  disabled={!canManage}
                  label={DAY_NAMES_LONG[day]}
                  onChange={(on) => setDay(day, on ? defaultRanges(shop) : [])}
                />
              </div>

              <div className="min-w-0 flex-1">
                {!working ? (
                  <p className="py-1.5 text-sm text-[var(--color-muted)]">Day off</p>
                ) : (
                  <RangeList
                    ranges={ranges}
                    label={DAY_NAMES_LONG[day]}
                    errorFor={errorFor(day)}
                    disabled={!canManage}
                    onChange={(next) => setDay(day, next)}
                  />
                )}
              </div>

              {canManage && working && (
                <div className="flex shrink-0 items-center gap-1 sm:pt-0.5">
                  {ranges.length < MAX_RANGES && (
                    <Button variant="ghost" size="sm" onClick={() => setDay(day, addRange(ranges, shop))}>
                      <Plus size={13} /> Add hours
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Copy these hours to every day"
                    aria-label={`Copy ${DAY_NAMES_LONG[day]} hours to every day`}
                    onClick={() => setWeek((prev) => prev.map(() => prev[day].map((r) => ({ ...r }))))}
                  >
                    <Copy size={13} /> Copy to all
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {canManage && (
        <SaveBar
          summary={`Works ${workingDays} day${workingDays === 1 ? '' : 's'} a week`}
          dirty={dirty}
          pending={saveMut.pending}
          onSave={() => saveMut.mutate()}
          saveDisabled={Object.keys(clientErrors).length > 0}
          onReset={() => setWeek(clone(savedWeek))}
          saveLabel="Save weekly hours"
        />
      )}
      {canManage && dirty && Object.keys(clientErrors).length > 0 && (
        <p role="alert" className="mt-2 text-right text-xs text-[var(--color-danger)]">
          Fix the highlighted hours before saving.
        </p>
      )}
    </div>
  )
}
