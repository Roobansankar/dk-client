import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { useCatalogue } from '../../context/CatalogueContext'
import { Skeleton } from '../StateViews'
import hairStyling from '../../assets/images/new-design/opt/service-hair-styling.jpg'
import hairColour from '../../assets/images/new-design/opt/service-hair-colour.jpg'
import skinFacial from '../../assets/images/new-design/opt/service-skin-facial.jpg'
import bridalBeauty from '../../assets/images/new-design/opt/service-bridal.jpg'
import studioImage from '../../assets/images/new-design/opt/studio.jpg'

/**
 * Homepage "Selected services" — an editorial composition rebuilt to the
 * `design-references/service-references.png` reference:
 *
 *   ┌──────────────┬───────────────────────────────┐
 *   │ warm text    │  01 photo tile │ 02 photo tile │
 *   │ panel        │  03 photo tile │ 04 photo tile │
 *   │ (eyebrow,    ├───────────────────────────────┤
 *   │  big serif,  │  05 full-width studio strip    │
 *   │  copy, link, └───────────────────────────────┘
 *   │  3 feature marks)
 *
 * A 2fr : 3fr split from `xl`; a single reflowed column below that (tablet /
 * mobile) which keeps the same order and hierarchy.
 *
 * The four grid tiles are the LIVE catalogue (first four categories from
 * `useCatalogue()`) — no static/demo categories are ever substituted. Their
 * name and in-page link always come from the catalogue; only the photography
 * is local: a category's own `image` wins when present, otherwise a curated
 * showcase photo paired by position. While the catalogue is loading the tiles
 * show as skeletons; if it's empty or failed, only the text panel and the
 * evergreen "Designed for your beauty" studio tile render (both of those are
 * fixed marketing content, not service data).
 */

/** Curated showcase photography, paired with the live categories by position. */
const SHOWCASE_IMAGES = [hairStyling, hairColour, skinFacial, bridalBeauty]

/** Static brand reassurances shown under the panel copy — not service data. */
const FEATURES = [
  { mark: 'solid', title: 'Premium Care', blurb: 'Quality products for lasting results.' },
  { mark: 'open', title: 'Expert Team', blurb: 'Skilled professionals who care.' },
  { mark: 'small', title: 'Personal Touch', blurb: 'Tailored services just for you.' },
]

const pad = (n) => String(n).padStart(2, '0')

/** Small editorial diamond mark — filled, outline or small, per the reference. */
function DiamondMark({ variant }) {
  const size = variant === 'small' ? 11 : 14
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="text-ink"
    >
      <rect
        x="2.4"
        y="2.4"
        width="7.2"
        height="7.2"
        transform="rotate(45 6 6)"
        fill={variant === 'open' ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

/**
 * One full-bleed image tile with a dark scrim, a corner number + rule, a
 * bottom-left eyebrow/title and a circular ↗ action arrow. The whole tile is a
 * single link; the number and eyebrow are decorative, so the link's name is
 * the title.
 *
 * The aspect ratio lives on the LINK (not the image): this grid's rows use
 * CSS Grid's default cross-axis stretch, so a tile can end up taller than its
 * own aspect-ratio height would naturally give it (e.g. the wide studio strip
 * when the text panel beside it runs long, or the catalogue returns fewer
 * than 4 categories). The image is absolutely positioned and fills 100% of
 * whatever height the link ends up with, so there is never a bare `bg-scrim`
 * gap below the photo — see design-references/service-references.png.
 *
 * The arrow is a ~40px light disc with a thin diagonal ↗ glyph — one clean
 * editorial style for every tile (the `wide` studio strip only scales its
 * type). It sits over dark photography in both themes, so the light-on-dark
 * treatment stays legible either way; the link carries a white focus ring.
 */
function ShowcaseTile({ to, image, index, eyebrow, title, wide = false }) {
  return (
    <Link
      to={to}
      className={clsx(
        'group relative block overflow-hidden bg-scrim no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        wide
          ? 'aspect-[4/3] sm:aspect-[16/7] xl:aspect-[21/6]'
          : 'aspect-[4/3] sm:aspect-[3/2]',
      )}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/30 to-scrim/10"
      />

      {/* Corner number + short rule */}
      <span
        aria-hidden="true"
        className="absolute left-5 top-5 text-[0.7rem] font-medium tabular-nums tracking-[0.1em] text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]"
      >
        {pad(index)}
        <span className="mt-1.5 block h-px w-7 bg-white/45" />
      </span>

      <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
        <span className="block min-w-0">
          <span
            aria-hidden="true"
            className="block truncate text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/75 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]"
          >
            {eyebrow}
          </span>
          <span
            className={clsx(
              'mt-2 block font-serif text-white [text-shadow:0_2px_18px_rgb(0_0_0/0.55)]',
              wide ? 'text-xl sm:text-[1.7rem]' : 'text-xl sm:text-[1.35rem]',
            )}
          >
            {title}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/90 text-[#1c1a15] backdrop-blur-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:bg-white"
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
    <section id="services" className="scroll-mt-24 border-t border-line bg-surface">
      <Container className="section-y">
        <div className="grid gap-2.5 xl:grid-cols-[2fr_3fr]">
          {/* Left — editorial text panel */}
          <div className="flex flex-col bg-surface-sunken p-8 sm:p-10 xl:p-12">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                Selected services
              </p>
              <h2 className="mt-7 font-serif text-[2.5rem] leading-[1.05] text-ink sm:text-[2.75rem] lg:text-[2.9rem] xl:text-[3.15rem]">
                Beauty with <em className="italic">purpose.</em>
                <br />
                Style with <em className="italic">confidence.</em>
              </h2>
              <p className="mt-7 max-w-sm text-sm leading-relaxed text-ink-soft">
                Explore our signature beauty services, carefully designed to
                bring together modern style, thoughtful care and confidence.
              </p>
              <Link
                to="/services"
                className="btn mt-9 self-start rounded-full no-underline"
              >
                View all services
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <ul className="mt-14 grid grid-cols-1 gap-y-6 border-t border-line-strong pt-8 sm:grid-cols-3 sm:gap-y-0 xl:mt-auto">
              {FEATURES.map(({ mark, title, blurb }, i) => (
                <li
                  key={title}
                  className={clsx(
                    'sm:px-3 sm:first:pl-0 sm:last:pr-0',
                    i > 0 &&
                      'border-t border-line pt-6 sm:border-l sm:border-t-0 sm:pt-0',
                  )}
                >
                  <span className="flex h-4 items-center">
                    <DiamondMark variant={mark} />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{blurb}</p>
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
                      image={category.image || SHOWCASE_IMAGES[i] || SHOWCASE_IMAGES[0]}
                      index={i + 1}
                      eyebrow={category.name}
                      title={category.name}
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
              title="Designed for your beauty."
              wide
            />
          </div>
        </div>
      </Container>
    </section>
  )
}
