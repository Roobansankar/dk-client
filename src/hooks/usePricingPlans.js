import { useApiResource } from './useApi'

/**
 * Active pricing plans / combo offers, from `GET /api/pricing-plans` — the
 * public endpoint that returns only enabled plans, ordered by the studio
 * (`PricingPlan::active()->ordered()`). This is the single source of truth: a
 * plan created, edited, enabled/disabled, reordered or deleted in the admin
 * panel flows straight through here with no duplicate static list.
 *
 * There is deliberately no static fallback — plans are studio-authored content,
 * so an empty or unreachable API means "no offers to show" and the consuming
 * section renders its own empty / error state rather than inventing pricing.
 *
 * Returns plans shaped:
 *   { id, name, description, price, validityDays, features, sortOrder }
 */

function transform(rows) {
  return (rows ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description || '',
    price: plan.price,
    validityDays: plan.validity_days ?? null,
    features: Array.isArray(plan.features) ? plan.features : [],
    sortOrder: plan.sort_order ?? 0,
  }))
}

export function usePricingPlans() {
  const { data, loading, error, reload } = useApiResource('/pricing-plans', {
    transform,
    // An admin can add / edit / toggle a plan in another tab — re-pull on focus
    // (and bfcache restore) so the homepage reflects it without a manual
    // reload. Event-driven, mirrors useProducts / useGallery.
    revalidateOnFocus: true,
  })

  return { plans: data ?? [], loading, error, reload }
}
