/**
 * DK StyleHub service categories.
 *
 * Category names + summaries are REAL, from the studio's own site:
 *   https://sites.google.com/view/the-dk-stylehub/price-details
 *   https://sites.google.com/view/the-dk-stylehub/home  ("OUR SERVICES")
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ TEMPORARY PLACEHOLDER TREATMENTS & PRICES
 * The individual `services` entries below are generic, industry-standard salon
 * treatments with indicative Indian-market INR prices and durations. They exist
 * ONLY so the /services menu and the booking form have something to render
 * during development. They are NOT verified DK StyleHub services, durations, or
 * prices. Every price is tagged `// TEMP PRICE`. Replace the `services` arrays
 * (and set PRICING_IS_PLACEHOLDER to false) with real studio/backend data.
 * Advance amounts are intentionally NOT stored here — per PRODUCT.md the
 * backend owns them (see src/data/bookingAdapter.js).
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @typedef {Object} Treatment
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {number} [durationMin]
 * @property {number} priceInr           TEMPORARY placeholder price.
 * @property {Array<'women'|'men'|'unisex'>} genders
 *
 * @typedef {Object} ServiceCategory
 * @property {string} id                 Stable slug + in-page anchor.
 * @property {string} name               Category name, verbatim from source.
 * @property {string} summary            Short description, from source.
 * @property {Array<'women'|'men'|'unisex'>} genders
 * @property {Treatment[]} services
 */

export const PRICING_IS_PLACEHOLDER = true

const ALL_GENDERS = ['women', 'men', 'unisex']

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPaiseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format an INR amount, e.g. 1200 -> "₹1,200". Paise are shown only when
 * present (1102.5 -> "₹1,102.50"), so tax-inclusive prices aren't rounded.
 */
export const formatInr = (amount) =>
  Number.isInteger(Math.round(Number(amount) * 100) / 100)
    ? inrFormatter.format(amount)
    : inrPaiseFormatter.format(amount)

/** @type {ServiceCategory[]} */
export const serviceCategories = [
  {
    id: 'haircuts-and-styling',
    name: 'Haircuts and Styling',
    summary: 'From classic cuts to the latest trends.',
    genders: ALL_GENDERS,
    services: [
      {
        id: 'mens-haircut',
        name: "Men's Haircut",
        description: 'Consultation, cut and finish.',
        durationMin: 40,
        priceInr: 600, // TEMP PRICE
        genders: ['men'],
      },
      {
        id: 'womens-haircut',
        name: "Women's Haircut",
        description: 'Consultation, cut and blow-dry.',
        durationMin: 60,
        priceInr: 1200, // TEMP PRICE
        genders: ['women'],
      },
      {
        id: 'wash-and-blow-dry',
        name: 'Hair Wash & Blow-Dry',
        durationMin: 40,
        priceInr: 700, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'beard-grooming',
        name: 'Beard Trim & Shape',
        durationMin: 20,
        priceInr: 350, // TEMP PRICE
        genders: ['men'],
      },
    ],
  },
  {
    id: 'color-and-highlights',
    name: 'Color and Highlights',
    summary:
      'Colour work using high-quality products to keep hair healthy and radiant.',
    genders: ALL_GENDERS,
    services: [
      {
        id: 'root-touch-up',
        name: 'Root Touch-Up',
        description: 'Regrowth colour at the roots.',
        durationMin: 60,
        priceInr: 1500, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'global-colour',
        name: 'Global Colour',
        description: 'Single shade through the full head.',
        durationMin: 120,
        priceInr: 3200, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'partial-highlights',
        name: 'Highlights — Partial',
        durationMin: 150,
        priceInr: 4500, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'balayage',
        name: 'Balayage',
        description: 'Hand-painted, blended lightening.',
        durationMin: 180,
        priceInr: 6500, // TEMP PRICE
        genders: ALL_GENDERS,
      },
    ],
  },
  {
    id: 'hair-treatment',
    name: 'Hair Treatment',
    summary:
      'Treatments that provide intense moisture and nutrients to restore softness and manageability.',
    genders: ALL_GENDERS,
    services: [
      {
        id: 'hair-spa',
        name: 'Hair Spa',
        description: 'Cleanse, mask and scalp massage.',
        durationMin: 45,
        priceInr: 1400, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'keratin-smoothening',
        name: 'Keratin Smoothening',
        durationMin: 150,
        priceInr: 5500, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'anti-hairfall-treatment',
        name: 'Anti-Hairfall Treatment',
        durationMin: 60,
        priceInr: 2200, // TEMP PRICE
        genders: ALL_GENDERS,
      },
    ],
  },
  {
    id: 'skin-care-and-makeup',
    name: 'Skin Care and Makeup',
    summary: 'Facials, makeup application, and other beauty treatments.',
    genders: ALL_GENDERS,
    services: [
      {
        id: 'express-facial',
        name: 'Express Facial',
        description: 'Cleanse, exfoliate and hydrate.',
        durationMin: 45,
        priceInr: 1600, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'brightening-facial',
        name: 'Brightening Facial',
        durationMin: 75,
        priceInr: 3200, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'clean-up',
        name: 'Clean-Up',
        durationMin: 30,
        priceInr: 900, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'occasion-makeup',
        name: 'Occasion Makeup',
        description: 'Full face for an event.',
        durationMin: 90,
        priceInr: 3800, // TEMP PRICE
        genders: ['women', 'unisex'],
      },
    ],
  },
  {
    id: 'massage-and-relaxation',
    name: 'Massage and Relaxation',
    summary: 'Massage therapies designed to reduce stress and promote well-being.',
    genders: ALL_GENDERS,
    services: [
      {
        id: 'head-massage',
        name: 'Head Massage',
        durationMin: 30,
        priceInr: 600, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'head-shoulder-massage',
        name: 'Head & Shoulder Massage',
        durationMin: 45,
        priceInr: 950, // TEMP PRICE
        genders: ALL_GENDERS,
      },
      {
        id: 'back-massage',
        name: 'Back Massage',
        durationMin: 45,
        priceInr: 1500, // TEMP PRICE
        genders: ALL_GENDERS,
      },
    ],
  },
]
