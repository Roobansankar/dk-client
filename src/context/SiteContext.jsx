import { createContext, useContext } from 'react'
import { useApiResource } from '../hooks/useApi'
import { site as staticSite } from '../data/site'

/**
 * Site-wide brand + contact details, from `GET /api/site-settings`.
 *
 * Admin-managed business data (phone, email, address, hours, shop times,
 * socials) is only ever shown when the API actually returned it — while
 * loading or after a failed/unavailable request those fields are `null`/`[]`,
 * never a possibly-stale hardcoded number standing in for real data. Existing
 * "not confirmed yet" UI branches (Footer.jsx, Contact.jsx) already handle a
 * falsy value correctly.
 *
 * `name`/`description` and the two fields that were never admin-managed to
 * begin with (the Contact photo, legal links) keep the static defaults from
 * src/data/site.js regardless — the brand name in particular is already
 * hardcoded the same way elsewhere (Navbar, page `<title>`s) independent of
 * this context, so there's nothing this fallback could make look fake.
 */

const UNAVAILABLE = {
  name: staticSite.name,
  description: staticSite.description,
  phone: null,
  email: null,
  address: null,
  hours: null,
  shopOpensAt: null,
  shopClosesAt: null,
  socials: [],
  image: staticSite.image,
  legal: staticSite.legal,
}

const SiteContext = createContext(UNAVAILABLE)

function mergeSettings(raw) {
  const s = raw || {}
  const phoneDisplay = s.phone || null
  const phoneHref =
    s.phone_href || (s.phone ? `tel:${String(s.phone).replace(/[^\d+]/g, '')}` : null)

  const socials = [
    s.instagram_url && { label: 'Instagram', href: s.instagram_url },
    s.whatsapp_url && { label: 'WhatsApp', href: s.whatsapp_url },
    s.facebook_url && { label: 'Facebook', href: s.facebook_url },
  ].filter(Boolean)

  return {
    name: s.salon_name || staticSite.name,
    description: s.description || staticSite.description,
    phone: phoneDisplay ? { display: phoneDisplay, href: phoneHref } : null,
    email: s.email ?? null,
    address: s.address ?? null,
    hours: s.business_hours ?? null,
    shopOpensAt: s.shop_opens_at ?? null,
    shopClosesAt: s.shop_closes_at ?? null,
    socials,
    // Not admin-managed — always the static defaults.
    image: staticSite.image,
    legal: staticSite.legal,
  }
}

export function SiteProvider({ children }) {
  const { data } = useApiResource('/site-settings', { transform: mergeSettings })

  return <SiteContext.Provider value={data ?? UNAVAILABLE}>{children}</SiteContext.Provider>
}

/**
 * Site brand + contact details (never null). Admin-managed fields
 * (phone/email/address/hours/shop times/socials) are null/empty until a real
 * API response has actually arrived — check them before rendering, exactly
 * like any other API-driven field.
 */
export function useSite() {
  return useContext(SiteContext)
}
