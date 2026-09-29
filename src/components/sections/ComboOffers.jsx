import { useEffect, useState } from 'react'
import { ArrowRight, Check, Phone, X } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { usePricingPlanList } from '../../context/PricingPlansContext'
import { CardSkeletonGrid, Notice } from '../StateViews'
import { formatInr } from '../../data/services'
import { site } from '../../data/site'

/**
 * Homepage "Combo Offers" — studio-curated service packages, shown directly
 * above the Products section.
 *
 * SINGLE SOURCE OF TRUTH: every card is drawn from `GET /api/pricing-plans`
 * (via usePricingPlanList → PricingPlansProvider → usePricingPlans), the exact
 * same public endpoint the admin panel writes to. A plan added, edited,
 * enabled/disabled, reordered or deleted in Admin → Pricing Plans flows
 * straight through here — there is no hardcoded duplicate pricing anywhere on
 * the site. The fetch is shared app-wide, so mounting this section adds no
 * extra request.
 *
 * States (never breaks the homepage):
 *   • loading            → header + hairline card skeletons
 *   • API/network error  → header + a quiet Notice, no cards
 *   • no active plans    → section renders nothing (like GalleryPreview /
 *                          ProductShowcase when their feed is empty)
 *
 * Cards share the Products page ComboCard design (rounded card, Combo pill,
 * checklist panel, price + pill CTA footer). Fully responsive 320px→desktop
 * and theme-aware via the shared tokens.
 */

/** e.g. 90 → "Valid 90 days", 365 → "Valid 1 year". */
function validityLabel(days) {
  if (!days) return null
  if (days % 365 === 0) {
    const years = days / 365
    return `Valid ${years} year${years > 1 ? 's' : ''}`
  }
  if (days % 30 === 0) {
    const months = days / 30
    return `Valid ${months} month${months > 1 ? 's' : ''}`
  }
  return `Valid ${days} days`
}

/**
 * "Book this package" doesn't start the online booking flow — packages are
 * booked by calling the studio, so this just shows the number. Same overlay
 * pattern as BookingAuthGate (backdrop click / Esc / X to close).
 */
function BookPackageModal({ plan, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-ink/40 p-0"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-0 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-package-title"
          className="relative w-full max-w-md rounded-t-[var(--radius-lg,0.75rem)] border border-line bg-surface p-6 shadow-xl sm:rounded-[var(--radius-lg,0.75rem)] sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="btn-ghost absolute right-3 top-3 rounded p-1.5 text-muted hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <p className="eyebrow pr-8">{plan.name}</p>
          <h3 id="book-package-title" className="mt-2 pr-8 font-serif text-2xl text-ink">
            Book this package
          </h3>

          <p className="mt-3 text-sm text-ink-soft">
            To book this package, please contact the studio and we’ll set up your
            appointment.
          </p>

          <a
            href={site.phone.href}
            className="btn mt-6 min-h-11 w-full justify-center rounded-full no-underline"
          >
            <Phone size={15} aria-hidden="true" />
            {site.phone.display}
          </a>

          <p className="mt-6 text-center text-sm text-muted">Thank you!</p>
        </div>
      </div>
    </div>
  )
}

function ComboOfferCard({ plan }) {
  const validity = validityLabel(plan.validityDays)
  const [contactOpen, setContactOpen] = useState(false)

  // Same card language as the Products page ComboCard (shop/ComboCard.jsx):
  // soft rounded card, frosted Combo pill, serif title + description, a tinted
  // checklist panel, and a price-left / pill-CTA-right footer. Plans carry no
  // image, so there is no photo frame — the card starts at its header.
  return (
    <li className="flex min-w-0">
      <article className="group flex h-full w-full flex-col rounded-[1.75rem] border border-line bg-paper p-3 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.28)] transition-shadow duration-300 hover:shadow-[0_24px_48px_-22px_rgb(0_0_0/0.34)]">
        <div className="flex flex-1 flex-col px-2 pb-2 pt-3 sm:px-3">
          <p className="self-start rounded-full bg-surface-sunken px-3 py-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ink-soft">
            Combo offer
          </p>

          <h3 className="mt-4 font-serif text-xl leading-snug text-ink">{plan.name}</h3>

          {plan.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {plan.description}
            </p>
          )}

          {plan.features.length > 0 && (
            <div className="mt-4 rounded-2xl bg-surface-sunken/60 px-3.5 py-2">
              <p className="pt-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
                What’s included
              </p>
              <ul className="mt-1 divide-y divide-line">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5 text-sm text-ink">
                    <span
                      aria-hidden="true"
                      className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink bg-ink text-paper"
                    >
                      <Check size={12} />
                    </span>
                    <span className="min-w-0 leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                  Package price
                </p>
                <p className="mt-0.5 text-2xl font-medium leading-tight tabular-nums text-ink">
                  {formatInr(plan.price)}
                </p>
                {validity && (
                  <p className="mt-0.5 text-xs text-muted">{validity}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="btn min-h-11 rounded-full px-6 no-underline"
              >
                Book this package
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </article>
      {contactOpen && <BookPackageModal plan={plan} onClose={() => setContactOpen(false)} />}
    </li>
  )
}

export default function ComboOffers() {
  const { plans, loading, error } = usePricingPlanList()

  // No active plans and nothing went wrong → show nothing, exactly like the
  // sibling homepage sections do with an empty feed. Keeps section order intact
  // (About still follows whatever precedes this) without an awkward empty box.
  if (!loading && !error && plans.length === 0) return null

  // Homepage teaser: at most 3 packages.
  const visiblePlans = plans.slice(0, 3)
  const count = visiblePlans.length

  return (
    <section
      id="combo-offers"
      className="scroll-mt-20 border-t border-line bg-surface"
    >
      <Container className="section-y">
        <header className="measure">
          <p className="eyebrow">Combo offers</p>
          <h2 className="mt-4">Packages, thoughtfully bundled.</h2>
          <p className="mt-4 text-ink-soft">
            A few of our services grouped into better value — chosen by the
            studio, priced up front.
          </p>
        </header>

        {loading && <CardSkeletonGrid count={3} className="mt-12 sm:mt-16" />}

        {!loading && error && plans.length === 0 && (
          <Notice className="mt-10">
            We couldn’t load our current packages just now. Please check back
            shortly, or ask us at the studio.
          </Notice>
        )}

        {!loading && plans.length > 0 && (
          <ul
            className={clsx(
              'mt-12 grid gap-5 sm:mt-16 sm:gap-6',
              count === 1 && 'max-w-md',
              count === 2 && 'sm:grid-cols-2',
              count >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {visiblePlans.map((plan) => (
              <ComboOfferCard key={plan.id} plan={plan} />
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
