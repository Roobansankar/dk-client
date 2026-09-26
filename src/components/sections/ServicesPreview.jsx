import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ImageOff, ShoppingBag, Star, Users } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { useCatalogue } from '../../context/CatalogueContext'
import { formatInr } from '../../data/services'
import { Skeleton } from '../StateViews'
import studioImage from '../../assets/images/new-design/opt/studio.jpg'

/**
 * Homepage "Our services" — photo-tiles grid.
 *
 *   ┌──────────────┬───────────────────────────────┐
 *   │ warm text    │  01 photo tile │ 02 photo tile │
 *   │ panel        │  03 photo tile │ 04 photo tile │
 *   │ (eyebrow,    ├───────────────────────────────┤
 *   │  headline,   │  05 full-width studio strip    │
 *   │  copy, link) └───────────────────────────────┘
 *
 * A 2fr : 3fr split from `xl`; a single reflowed column below that (tablet /
 * mobile) which keeps the same order and hierarchy.
 *
 * The four grid tiles are the LIVE catalogue (first four categories from
 * `useCatalogue()`) — no static/demo categories are ever substituted. Only
 * the admin-uploaded `image` is shown as photography — categories without an
 * upload render a neutral placeholder tile, never a static stock photo.
 * While the catalogue is loading the tiles show as skeletons; if it's empty
 * or failed, only the text panel and the studio strip render.
 */

const pad = (n) => String(n).padStart(2, '0')

/** Trust signals pinned to the foot of the text panel — each one links to a
 *  real proof point elsewhere on the site (reviews, team, shop), so the panel
 *  fills the column height on laptop instead of leaving a gap. */
const TRUST = [
  {
    icon: Star,
    title: 'Loved by clients',
    text: 'Real, unedited Google reviews.',
    href: '#reviews',
    cta: 'Read reviews',
  },
  {
    icon: Users,
    title: 'Skilled stylists',
    text: 'A dedicated team for hair & skin.',
    href: '#team',
    cta: 'Meet the team',
  },
  {
    icon: ShoppingBag,
    title: 'Pro products',
    text: 'The same ranges we use in-store.',
    href: '/products',
    cta: 'Shop products',
  },
]

/** "For women" / "For men" / "For everyone" — from the live catalogue. */
const audienceOf = (category) => {
  const genders = category.genders ?? []
  if (genders.length === 1 && genders[0] === 'women') return 'For women'
  if (genders.length === 1 && genders[0] === 'men') return 'For men'
  return 'For everyone'
}

/** "8 services · From ₹299" — the facts visitors scan for. */
function metaOf(category) {
  const services = category.services ?? []
  const count = services.length
  const countLabel = count === 1 ? '1 service' : `${count} services`
  const prices = services
    .map((s) => Number(s.priceInr))
    .filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length === 0) return countLabel
  return `${countLabel} · From ${formatInr(Math.min(...prices))}`
}

/** One tile: admin-uploaded photo with dark scrim, or a neutral placeholder
 *  when the category has no uploaded image yet — never a static stock photo.
 *
 *  The aspect ratio lives on the LINK (not the image): the grid's rows use
 *  CSS Grid's default cross-axis stretch, so a tile can end up taller than its
 *  own aspect-ratio height. The image is absolutely positioned and fills 100%
 *  of whatever height the link ends up with, so there is never a bare gap
 *  below the photo.
 *
 *  The arrow is a ~40px light disc with a thin diagonal ↗ glyph. It sits over
 *  dark photography in both themes; placeholder tiles use ink-on-sunken
 *  styling instead since there is no dark photo behind them.
 */
function ShowcaseTile({ to, image, index, eyebrow, title, meta, wide = false }) {
  return (
    <Link
      to={to}
      className={clsx(
        'group relative block overflow-hidden no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        image
          ? 'bg-scrim focus-visible:outline-white'
          : 'border border-line bg-surface-sunken focus-visible:outline-ink',
        wide
          ? 'aspect-[4/3] sm:aspect-[16/7] xl:aspect-[21/6]'
          : 'aspect-[4/3] sm:aspect-[3/2]',
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted">
            <ImageOff size={19} aria-hidden="true" />
          </span>
          <span className="max-w-[14rem] text-xs leading-relaxed text-muted">
            Photo coming soon
          </span>
        </span>
      )}
      {image && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/30 to-scrim/10"
        />
      )}

      {/* Corner number + short rule */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute left-5 top-5 text-[0.7rem] font-medium tabular-nums tracking-[0.1em]',
          image ? 'text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]' : 'text-muted',
        )}
      >
        {pad(index)}
        <span className={clsx('mt-1.5 block h-px w-7', image ? 'bg-white/45' : 'bg-line-strong')} />
      </span>

      <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
        <span className="block min-w-0">
          <span
            aria-hidden="true"
            className={clsx(
              'block truncate text-[0.62rem] font-semibold uppercase tracking-[0.16em]',
              image ? 'text-white/75 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]' : 'text-muted',
            )}
          >
            {eyebrow}
          </span>
          <span
            className={clsx(
              'mt-2 block font-serif',
              image ? 'text-white [text-shadow:0_2px_18px_rgb(0_0_0/0.55)]' : 'text-ink',
              wide ? 'text-xl sm:text-[1.7rem]' : 'text-xl sm:text-[1.35rem]',
            )}
          >
            {title}
          </span>
          {meta && (
            <span
              aria-hidden="true"
              className={clsx(
                'mt-1.5 block truncate text-xs font-medium tabular-nums tracking-wide',
                image ? 'text-white/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]' : 'text-muted',
              )}
            >
              {meta}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full backdrop-blur-sm transition duration-200 group-hover:-translate-y-0.5',
            image
              ? 'bg-white/90 text-[#1c1a15] group-hover:bg-white'
              : 'border border-line bg-surface text-ink-soft group-hover:bg-surface-hover',
          )}
        >
          <ArrowUpRight size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </span>
    </Link>
  )
}

export default function ServicesPreview() {
  const { categories, loading } = useCatalogue()
  const cards = categories.slice(0, 4)

  return (
    <section id="services" className="scroll-mt-20 border-t border-line bg-surface">
      <Container className="section-y">
        <div className="grid gap-2.5 xl:grid-cols-[2fr_3fr]">
          {/* Left — editorial text panel */}
          <div className="flex flex-col bg-surface-sunken p-8 sm:p-10 xl:p-12">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                Our services
              </p>
              <h2 className="mt-7 font-serif text-[2.5rem] leading-[1.05] text-ink sm:text-[2.75rem] lg:text-[2.9rem] xl:text-[3.15rem]">
                What would you like <em className="italic">today?</em>
              </h2>
              <p className="mt-7 max-w-sm text-sm leading-relaxed text-ink-soft">
                Pick a category to see exact services, prices and durations —
                then book your slot online.
              </p>
              <Link
                to="/services"
                className="btn mt-9 self-start rounded-full no-underline"
              >
                View all services
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <ul className="mt-10 hidden grid-cols-1 gap-6 border-t border-line-strong pt-8 sm:grid sm:grid-cols-3 xl:mt-auto">
              {TRUST.map(({ icon: Icon, title, text, href, cta }) => (
                <li key={title}>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-line-strong text-ink">
                    <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                    {title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                  <a href={href} className="mt-2 inline-block text-xs font-semibold text-ink">
                    {cta}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — showcase grid + full-width studio strip */}
          <div className="grid gap-2.5">
            {loading ? (
              <div aria-hidden="true" className="grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full sm:aspect-[3/2]" />
                ))}
              </div>
            ) : (
              cards.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {cards.map((category, i) => (
                    <ShowcaseTile
                      key={category.id}
                      to={`/services#${category.id}`}
                      image={category.image || null}
                      index={i + 1}
                      eyebrow={audienceOf(category)}
                      title={category.name}
                      meta={metaOf(category)}
                    />
                  ))}
                </div>
              )
            )}

            <ShowcaseTile
              to="/services"
              image={studioImage}
              index={(cards.length || 4) + 1}
              eyebrow="The studio"
              title="Explore the full menu."
              wide
            />
          </div>
        </div>
      </Container>
    </section>
  )
}
