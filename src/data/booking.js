/**
 * Booking form option model — pure helpers over the live service catalogue
 * (see src/hooks/useServiceCatalogue.js). Categories and services always match
 * the published menu; options are filtered by the selected gender + category.
 */

/** Only two choices are collected — no "prefer not to say"/unisex option. */
export const bookingGenders = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
]

/** Map the form's gender choice to the value the backend expects. */
export const genderForApi = (value) => ({ women: 'female', men: 'male' })[value] ?? value

/** Category options for the booking selector. */
export function bookingCategories(categories) {
  return (categories ?? []).map((category) => ({ id: category.id, name: category.name }))
}

/**
 * Services available for a gender + category selection: a service shows
 * when it's tagged for the chosen gender, OR tagged 'unisex' (a service the
 * catalogue marks as open to everyone stays reachable even though the form
 * itself only ever collects a specific Men/Women choice — those are two
 * different things: the customer's own selection vs. a service's own
 * applicability).
 */
export function getBookableServices(categories, gender, categoryId) {
  const category = (categories ?? []).find((entry) => entry.id === categoryId)
  if (!category || !gender) return []
  return category.services.filter(
    (service) => service.genders.includes(gender) || service.genders.includes('unisex'),
  )
}
