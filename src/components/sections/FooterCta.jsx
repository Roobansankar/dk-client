import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

/** The dedicated booking page. */
const BOOKING = '/booking'

/**
 * Homepage closing CTA — a STANDALONE section (no overlap with the footer):
 * a centred, dark, premium panel sitting on the page's light ground with
 * generous whitespace above and below, so it reads as its own moment before
 * the footer. Inspired by `design-references/CTA-Section-References`.
 *
 *   … Booking ──▶ standalone CTA ──▶ Footer
 *
 * The accent token is pinned to its on-dark value for the panel subtree, so the
 * emphasised phrase and the atmospheric glow share one warm gold in both
 * themes. Both CTAs point at existing destinations (the /booking page and
 * the /contact route) — nothing here is invented.
 */
export default function FooterCta() {
  return (
    <section className="border-t border-line bg-paper">
      <div className="container-page section-y">
        <div
          className="relative isolate mx-auto max-w-4xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-scrim px-6 py-16 text-center text-white shadow-[0_30px_60px_-40px_rgb(0_0_0/0.5)] sm:rounded-[2rem] sm:px-12 sm:py-20 lg:py-24"
          style={{ '--color-accent': '#c9a878' }}
        >
          {/* Atmospheric glow — a warm accent horizon at the base and a soft
              wash from above. Purely decorative. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -bottom-32 left-1/2 h-72 w-[150%] -translate-x-1/2 rounded-[100%] bg-accent/30 blur-3xl" />
            <div className="absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-white/[0.07] blur-3xl" />
          </div>
          {/* Hairline arc echoing the reference's light horizon. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent sm:inset-x-12"
          />

          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/50">
            Book your visit
          </p>
          <h2 className="mx-auto mt-5 max-w-[18ch] font-serif leading-[1.08] text-white text-[clamp(2rem,1.4rem+2.6vw,3.25rem)]">
            Ready when <em className="not-italic text-accent">you are</em>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/60">
            Choose a service, a stylist and a time that suits you — the studio
            confirms every appointment before it is final.
          </p>

          <div className="mx-auto mt-9 flex max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              to={BOOKING}
              className="btn btn-solid-light w-full justify-center rounded-full sm:w-auto"
            >
              Book an appointment
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="btn btn-on-dark w-full justify-center rounded-full sm:w-auto"
            >
              Contact the studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
