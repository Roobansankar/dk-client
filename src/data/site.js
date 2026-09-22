/**
 * Site-wide brand + contact details — the FALLBACK defaults.
 *
 * The live values come from `GET /api/site-settings` (see
 * src/context/SiteContext.jsx); this object is merged under them and is what
 * the site shows if the API is slow or unavailable. `image` and `legal` are
 * not admin-managed and always come from here.
 *
 * `phone` and `socials` are taken from the studio's own public website
 * (https://sites.google.com/view/the-dk-stylehub) — verify before launch.
 * `address` is the studio's confirmed street address. `email` and `hours` were
 * not published anywhere, so they are left null rather than invented. Fill them
 * in when supplied and the Contact page and Footer render them automatically.
 *
 * `image` is DK StyleHub's own supplied studio photography for the Contact page.
 * `legal` links point at the /terms and /privacy routes (see src/routes).
 */
import contactImage from '../assets/images/new-design/opt/studio.jpg'

export const site = {
  name: 'DK StyleHub',
  description:
    'A premium unisex beauty and styling studio — hair, colour, skin and massage, for everyone.',
  phone: { display: '+91 97904 31212', href: 'tel:+919790431212' },
  email: null,
  address:
    'Shop No: 117, Rooftop, H. Patel Rd, near Hotel Vijay Park Inn, Ram Nagar, Coimbatore, Tamil Nadu 641009',
  hours: null,
  // Manual opening hours (24-hour "H:i"). Admin-managed via Settings → Shop
  // Hours; these fallbacks mirror the hours the booking picker shipped with.
  shopOpensAt: '10:00',
  shopClosesAt: '19:30',
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/the_dk__stylehub' },
    { label: 'WhatsApp', href: 'https://wa.me/message/B32HQTKZGU3HF1' },
  ],
  image: {
    src: contactImage,
    alt: 'The DK StyleHub studio — styling chairs, mirrors and a calm lounge',
  },
  /** @type {{ label: string, to: string }[]} */
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms', to: '/terms' },
  ],
}
