import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { usePricingPlanList } from '../../context/PricingPlansContext'
import { CardSkeletonGrid, Notice } from '../StateViews'
import { formatInr } from '../../data/services'

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
 * Visual language matches the rest of the homepage: hairline cards on a warm
 * surface, serif headings, tabular prices, restrained hover. Fully responsive
 * 320px→desktop and theme-aware via the shared tokens (no literal colours).
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

function ComboOfferCard({ plan }) {
  const validity = validityLabel(plan.validityDays)

  return (
    <li className="min-w-0">
      <article className="flex h-full flex-col rounded-lg border border-white/10 bg-scrim p-6 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgb(0_0_0/0.35)] sm:p-8">
        <p className="self-start rounded-full bg-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70">
          Combo offer
        </p>

        <h3 className="mt-4 font-serif text-xl leading-snug text-white">{plan.name}</h3>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums text-white">
            {formatInr(plan.price)}
          </span>
          {validity && (
            <span className="text-sm text-white/60">{validity}</span>
          )}
        </p>

        {plan.description && (
          <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/75">
            {plan.description}
          </p>
        )}

        {plan.features.length > 0 && (
          <ul className={clsx('space-y-2.5', plan.description ? 'mt-5' : 'mt-5 border-t border-white/10 pt-5')}>
            {plan.features.map((feature, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/80">
                <Check
                  size={15}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-accent"
                />
                <span className="min-w-0">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-8">
          <Link
            to={{ pathname: '/', hash: '#booking' }}
            className="btn btn-on-dark w-full rounded-full no-underline"
          >
            Book this package
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </article>
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
      className="scroll-mt-24 border-t border-line bg-surface"
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
              'mt-12 grid gap-3 sm:mt-16 sm:gap-4',
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
