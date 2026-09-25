import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ImageOff } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import SegmentedFilter from '../components/ui/SegmentedFilter'
import FilterSelect from '../components/ui/FilterSelect'
import { formatInr } from '../data/services'
import { useCatalogue } from '../context/CatalogueContext'
import { CardSkeletonGrid, Notice } from '../components/StateViews'
import serviceBanner from '../assets/images/service-banner.png'

const BOOKING = '/booking'
const pad = (n) => String(n).padStart(2, '0')

const GENDER_LABEL = { women: 'Women', men: 'Men' }
const genderLabel = (genders) =>
  genders.length === 1 && GENDER_LABEL[genders[0]] ? GENDER_LABEL[genders[0]] : null

// The booking form's Gender step only ever collects a specific Men/Women
// choice (no "prefer not to say"/unisex catch-all — see data/booking.js), so
// a service open to everyone is left for the visitor to choose themselves
// rather than prefilling a value with no matching option.
const prefillGender = (genders) => (genders.length === 1 ? genders[0] : undefined)

const GENDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'hair', label: 'Hair' },
  { value: 'skin', label: 'Skin' },
]

function advanceNote(service) {
  const amount = Number(service.advanceAmount) || 0
  const pct = Number(service.advancePercentage) || 0

  if (amount > 0) return `${formatInr(amount)} advance`
  if (pct > 0) return `${pct}% advance`

  return null
}

/** Apply the gender + Hair/Skin filters to the merged catalogue. */
function filterCatalogue(categories, gender, type) {
  return categories
    .filter((category) => type === 'all' || category.type === type)
    .map((category) => ({
      ...category,
      services:
        gender === 'all'
          ? category.services
          : category.services.filter((service) => service.genders.includes(gender)),
    }))
    .filter((category) => category.services.length > 0)
}

/** One service line: name + price, description, meta, and a Book deep-link. */
function ServiceRow({ category, service }) {
  const gl = genderLabel(service.genders)
  const note = advanceNote(service)

  return (
    <li className="group border-b border-line py-5 first:border-t">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg text-ink">{service.name}</h3>

        {service.priceInr != null && (
          <span className="shrink-0 tabular-nums text-ink">
            {formatInr(service.priceInr)}
          </span>
        )}
      </div>

      {service.description && (
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft">
          {service.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
        {service.durationMin && <span>{service.durationMin} min</span>}

        {gl && (
          <>
            <span aria-hidden="true">·</span>
            <span>{gl}</span>
          </>
        )}

        {note && (
          <>
            <span aria-hidden="true">·</span>
            <span>{note}</span>
          </>
        )}
      </div>

      <Link
        to={BOOKING}
        state={{
          prefill: {
            category: category.id,
            gender: prefillGender(service.genders),
            service: service.id,
          },
        }}
        className="btn btn-outline mt-4 min-h-[2.5rem] rounded-full px-5 no-underline hover:border-ink hover:bg-ink hover:text-paper"
      >
        Book

        <ArrowRight
          size={13}
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

/** One catalogue category: the admin-uploaded photo (or a neutral
 *  placeholder when none uploaded) and a hairline service list, sides
 *  alternating down the page for an asymmetric editorial rhythm. */
function CategoryBlock({ category, index }) {
  const imageRight = index % 2 === 1

  return (
    <section id={category.id} className="scroll-mt-28">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <figure
          className={clsx(
            'relative self-start overflow-hidden border border-line bg-surface-sunken lg:col-span-5',
            imageRight ? 'lg:col-start-8' : 'lg:col-start-1',
          )}
        >
          {category.image ? (
            <img
              src={category.image}
              alt={`${category.name} — salon work photo`}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label={`${category.name} — photo coming soon`}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-surface-sunken px-6 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-muted">
                <ImageOff size={20} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-ink-soft">{category.name}</p>
              <p className="max-w-[16rem] text-xs leading-relaxed text-muted">
                Photo coming soon — add one from Admin → Services.
              </p>
            </div>
          )}

          {category.image && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-scrim/55 to-transparent"
            />
          )}

          <figcaption
            className={clsx(
              'absolute left-5 top-5 flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.2em]',
              category.image
                ? 'text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.55)]'
                : 'text-muted',
            )}
          >
            <span className="tabular-nums">{pad(index + 1)}</span>
            <span
              aria-hidden="true"
              className={clsx('h-px w-6', category.image ? 'bg-white/50' : 'bg-line-strong')}
            />
            <span>{category.name}</span>
          </figcaption>
        </figure>

        <div
          className={clsx(
            'lg:col-span-6',
            imageRight ? 'lg:col-start-1 lg:row-start-1' : 'lg:col-start-7',
          )}
        >
          <header className="border-b border-line pb-5">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">
              {category.name}
            </h2>

            {category.summary && (
              <p className="mt-3 max-w-prose text-ink-soft">{category.summary}</p>
            )}
          </header>

          <ul>
            {category.services.map((service) => (
              <ServiceRow
                key={service.id}
                category={category}
                service={service}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/**
 * Services routes: an editorial salon menu. A photographic hero, a restrained
 * filter row, then each catalogue category as an alternating image + hairline
 * price list. Categories, services, durations, prices and advance amounts all
 * come from the live backend catalogue (see src/context/CatalogueContext.jsx);
 * each "Book" link deep-links to the homepage booking form with the category /
 * gender / service preselected.
 *
 * Three routes share this page (see App.jsx): `/services` lists everything,
 * `/services/men` and `/services/women` are their own pages listing only that
 * gender's services, with no gender switch. The all-services page keeps a
 * "For" control whose options link out to those pages (not an in-page filter).
 *
 * @param {{ gender?: 'men' | 'women' }} props  set by the gender routes
 */
export default function Services({ gender: pageGender }) {
  const { categories, loading, error } = useCatalogue()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [type, setType] = useState('all')

  const gender = pageGender ?? 'all'
  const genderName = pageGender ? GENDER_LABEL[pageGender] : null

  const setGenderFilter = (value) => {
    navigate(value === 'all' ? '/services' : `/services/${value}`)
  }

  const hasTypeData = useMemo(
    () => categories.some((category) => category.type === 'hair' || category.type === 'skin'),
    [categories],
  )

  const visibleCategories = useMemo(
    () => filterCatalogue(categories, gender, type),
    [categories, gender, type],
  )

  // Old `/services?gender=men` links land on the dedicated page instead.
  const legacyGender = searchParams.get('gender')
  if (!pageGender && (legacyGender === 'men' || legacyGender === 'women')) {
    return <Navigate to={`/services/${legacyGender}`} replace />
  }

  return (
    <>
      <title>{`${genderName ? `${genderName}’s Services` : 'Services'} — DK StyleHub`}</title>
      <meta
        name="description"
        content={
          genderName
            ? `${genderName}’s services at DK StyleHub — a premium unisex beauty and styling studio.`
            : 'Services at DK StyleHub — a premium unisex beauty and styling studio.'
        }
      />

      <div className="texture-lines">
        {/* Banner — one photograph (styling tools fanned across silk, with a
            deliberate blank column on the left) with the heading and intro
            copy laid over it as real HTML, never baked into the image.
            `RootLayout` gives every non-home route (`<main>`) top padding to
            clear the fixed navbar; at `lg` and up this section cancels that
            padding (`lg:-mt-24` mirrors `main`'s `md:pt-24`) and grows to
            `100svh` so the photo runs truly edge-to-edge and fills the
            screen, with the (opaque, non-home) navbar floating over its top
            strip exactly as a fixed header does over any full-bleed hero.
            `object-right` crops surplus blank canvas from the left as the
            viewport's own ratio departs from the photo's, so the fanned
            tools — flush against the image's right edge — are never cropped;
            the text column narrows to match. Below `lg` the photo sits under
            the copy at its natural aspect ratio (`h-auto`), so the whole
            image — fanned tools included — shows at every width. The photo's tones are fixed
            regardless of theme (a photograph, like the homepage Hero — see
            Hero.jsx), so the overlay copy is pinned to light-theme ink
            colours rather than the ink/paper tokens, which invert in dark
            mode and would turn illegible against it. */}
        <section className="services-banner relative isolate w-full overflow-hidden bg-surface-sunken lg:-mt-24 lg:min-h-[100svh]">
          <div className="lg:absolute lg:inset-0 lg:z-10 lg:flex lg:items-center">
            <Container className="pt-[clamp(3.5rem,8vw,6rem)] pb-14 lg:pb-0 lg:pt-0">
              <div className="lg:max-w-[30%] lg:pl-[clamp(1rem,3vw,2.5rem)] lg:pr-8">
                <p className="eyebrow lg:text-[#6d6858]">
                  {genderName ? `${genderName}’s services` : 'Services'}
                </p>

                <h1 className="mt-4 font-serif text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.03] text-ink lg:text-[clamp(1.75rem,2.8vw,3.25rem)] lg:text-[#201e1b]">
                  Beauty, styled with intention.
                </h1>

                <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-soft lg:mt-4 lg:max-w-none lg:text-base lg:text-[#4a4740]">
                  {genderName
                    ? `Every service for ${genderName.toLowerCase()} is priced and timed up front, and books in a few taps.`
                    : 'Hair, colour, treatments, skin and massage — for all genders. Every service is priced and timed up front, and books in a few taps.'}
                </p>

                <Link to={BOOKING} className="btn mt-8 no-underline lg:mt-7">
                  Book Appointment
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </Container>
          </div>

          <img
            src={serviceBanner}
            alt="Salon styling tools — combs, shears and clips fanned across a silk backdrop"
            width={1737}
            height={906}
            loading="eager"
            fetchPriority="high"
            className="block h-auto w-full object-cover object-right lg:absolute lg:inset-0 lg:z-0 lg:h-full lg:w-full lg:object-cover lg:object-right"
          />
        </section>

        <Container className="section-y !pt-0">
          {error && !loading && (
            <Notice className="mt-14">
              We couldn’t load the service menu just now. Please refresh, or
              contact the studio to book.
            </Notice>
          )}

          {!loading && categories.length > 0 && (!pageGender || hasTypeData) && (
            <div className="mt-10 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10 sm:gap-y-4">
              {/* The gender pages list only their own gender, so the "For"
                  switch appears on the all-services page alone. */}
              {!pageGender && (
                <SegmentedFilter
                  legend="For"
                  options={GENDER_FILTERS}
                  value={gender}
                  onChange={setGenderFilter}
                  className="sm:w-auto"
                />
              )}

              {/* Type is the row's second filter after "For" on the all-services
                  page (the existing public-site select styling, not a second
                  pill — see FilterSelect); on a gender page it stands alone. */}
              {hasTypeData && (
                <FilterSelect
                  legend="Type"
                  options={TYPE_FILTERS}
                  value={type}
                  onChange={setType}
                />
              )}
            </div>
          )}

          {loading ? (
            <div className="mt-16 sm:mt-20">
              <CardSkeletonGrid count={6} />
            </div>
          ) : categories.length === 0 ? (
            <p className="mt-16 text-ink-soft">
              The service menu is being updated. Please check back shortly or
              contact the studio to book.
            </p>
          ) : visibleCategories.length === 0 ? (
            <div className="mt-16 text-ink-soft">
              <p>No services match this filter.</p>

              <button
                type="button"
                onClick={() => {
                  setType('all')
                  if (pageGender) setGenderFilter('all')
                }}
                className="mt-3 text-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-16 flex flex-col gap-20 sm:mt-20 sm:gap-28">
              {visibleCategories.map((category, index) => (
                <CategoryBlock
                  key={category.id}
                  category={category}
                  index={index}
                />
              ))}
            </div>
          )}
        </Container>
      </div>
    </>
  )
}