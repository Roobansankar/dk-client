import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Container from '../layout/Container'
import { hero } from '../../data/hero'

/** The dedicated booking page. */
const BOOKING = '/booking'

/**
 * Full-bleed, single static homepage hero.
 *
 * One editorial composition — a full-viewport studio photograph, with centred eyebrow → oversized wordmark headline → supporting line
 * → a CTA to the on-page Booking section. Reuses the sitewide `btn-solid-light`
 * treatment (see index.css), the same primary-over-photography style already
 * used by FooterCta and Contact. No carousel: there is exactly one hero image
 * and no autoplay/dots/state.
 */
export default function Hero() {
  return (
    <section
      aria-label="DK StyleHub"
      className="relative flex min-h-[80svh] w-full flex-col overflow-hidden bg-scrim text-white md:min-h-[100svh]"
    >
      {/* Art-directed per viewport: the browser fetches only the matching
          source. Desktop needs a landscape viewport ≥ lg, so large portrait
          tablets (e.g. 1032×1376) get the portrait tablet crop. The photo is
          shown untreated — no scrim/filter. */}
      <picture>
        <source
          media="(min-width: 64rem) and (orientation: landscape)"
          srcSet={hero.image.src}
        />
        <source media="(min-width: 48rem)" srcSet={hero.image.tablet} />
        <img
          src={hero.image.mobile}
          alt={hero.image.alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      <Container className="relative flex flex-1 flex-col items-center justify-center py-28 text-center">
        <p className="text-eyebrow font-medium uppercase tracking-[0.2em] text-white/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.45)] sm:tracking-[0.34em]">
          {hero.eyebrow}
        </p>

        <h1 className="mt-6 font-sans text-[clamp(2.25rem,8.5vw,7rem)] font-light uppercase leading-[1.05] tracking-[0.02em] text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.42)]">
          {hero.title}
        </h1>

        <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-white/85 [text-shadow:0_1px_12px_rgb(0_0_0/0.45)] sm:text-xl">
          {hero.bodyLead}
          <em className="italic">{hero.bodyEmphasis}</em>
        </p>

        <Link to={BOOKING} className="btn btn-solid-light mt-9 rounded-full no-underline">
          Book Appointment
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </Container>
    </section>
  )
}
