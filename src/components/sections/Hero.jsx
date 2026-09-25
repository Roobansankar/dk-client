import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Container from '../layout/Container'
import { hero } from '../../data/hero'

/** The dedicated booking page. */
const BOOKING = '/booking'

/**
 * Full-bleed, single static homepage hero.
 *
 * One editorial composition — a full-viewport studio photograph under a light
 * scrim, with centred eyebrow → oversized wordmark headline → supporting line
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
      <img
        src={hero.image.src}
        alt={hero.image.alt}
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Editorial scrim — a translucent cool-blue wash for a premium colour
          grade, then a flat neutral wash and a vertical gradient that darkens
          the top (under the transparent navbar) and the foot. The photo stays
          clearly visible and white type stays readable. Fixed values, so the
          treatment is identical in light and dark themes. */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#3f5a86]/16" />
      <div aria-hidden="true" className="absolute inset-0 bg-scrim/12" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-scrim/45 via-scrim/10 to-scrim/40"
      />

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
