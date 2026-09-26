/**
 * SEO helpers shared by <Seo> (src/components/Seo.jsx) and the build-time
 * robots.txt / sitemap.xml generator (vite.config.js).
 *
 * `SITE_URL` is the canonical production origin. Canonical URLs, og:url and
 * JSON-LD ids always point at it — even when the build is previewed on
 * localhost — so search engines only ever see one version of each page.
 * Override with `VITE_SITE_URL` if the site moves domain.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://dkstylehub.com').replace(/\/+$/, '')

export const SITE_NAME = 'DK StyleHub'

/** Static, un-hashed share image + logo in /public (stable absolute URLs). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`
export const DEFAULT_OG_IMAGE_ALT =
  'The DK StyleHub studio floor — marble flooring, styling stations and warm daylight'
export const LOGO_URL = `${SITE_URL}/logo.png`

/** The studio's email as shown in the site footer. */
export const PUBLIC_EMAIL = 'info@dkstylehub.com'

/** Stable JSON-LD node ids so page-level data can reference the salon/site. */
export const SALON_ID = `${SITE_URL}/#salon`
export const WEBSITE_ID = `${SITE_URL}/#website`

/**
 * The studio's Google Maps place, taken from the map embedded on /contact
 * (place "The_DK Stylehub", CID 0x57fd23b2ccdef8c9, pinned at these coordinates).
 */
const MAP_URL = 'https://maps.google.com/?cid=6340263101255841993'
const GEO = { latitude: 11.0108196, longitude: 76.9602525 }

/** Absolute canonical URL for a route path: no query/hash, no trailing slash. */
export function absoluteUrl(path = '/') {
  const clean = String(path).split(/[?#]/)[0].replace(/\/+$/, '')
  if (!clean) return `${SITE_URL}/`
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`
}

/** Absolute URL for a bundled asset (Vite gives a root-relative hashed path). */
export function assetUrl(src) {
  if (!src) return null
  if (/^https?:/i.test(src)) return src
  return `${SITE_URL}${src.startsWith('/') ? src : `/${src}`}`
}

/** Collapse whitespace and trim to a search-snippet length at a word boundary. */
export function metaDescription(text, max = 160) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:—–-]+$/, '')}…`
}

/**
 * BeautySalon node built ONLY from details the live site actually shows:
 * name, phone (site settings), footer email, social profiles, the Contact
 * page's map pin, and the address when an admin has entered one. Opening
 * hours are deliberately omitted — the site shows opening/closing times but
 * not which days they apply to.
 */
export function salonSchema(site) {
  const sameAs = (site.socials ?? [])
    .filter((s) => s.label !== 'WhatsApp') // a chat link, not a profile
    .map((s) => s.href)

  return {
    '@type': 'BeautySalon',
    '@id': SALON_ID,
    name: site.name || SITE_NAME,
    description: site.description,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    image: DEFAULT_OG_IMAGE,
    ...(site.phone?.display && { telephone: site.phone.display }),
    email: site.email || PUBLIC_EMAIL,
    address: {
      '@type': 'PostalAddress',
      ...(site.address && { streetAddress: site.address }),
      addressLocality: 'Coimbatore',
      addressRegion: 'Tamil Nadu',
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', ...GEO },
    hasMap: MAP_URL,
    ...(sameAs.length > 0 && { sameAs }),
  }
}

/** BreadcrumbList from [{ name, path }] (first item is usually Home). */
export function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
