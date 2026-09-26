import Hero from '../components/sections/Hero'
import ServicesPreview from '../components/sections/ServicesPreview'
import MeetTheTeam from '../components/sections/MeetTheTeam'
import ComboOffers from '../components/sections/ComboOffers'
import ProductShowcase from '../components/sections/ProductShowcase'
import VideoMarquee from '../components/sections/VideoMarquee'
import CustomerReviews from '../components/sections/CustomerReviews'
import FooterCta from '../components/sections/FooterCta'
import Seo from '../components/Seo'
import { useSite } from '../context/SiteContext'
import { SALON_ID, SITE_NAME, SITE_URL, WEBSITE_ID, salonSchema } from '../lib/seo'

/**
 * Homepage. Fixed section order:
 *   Hero → Our Services → Meet the Team → Combo Offers →
 *   Our Products → Video → Reviews → Closing CTA →
 *   (Footer, from RootLayout).
 *
 * The studio story lives on its own `/about` page (linked from the
 * navbar) — it is intentionally not repeated here.
 *
 * Booking lives on its own `/booking` page — every "Book Appointment"
 * button across the site links there instead of an on-page section.
 *
 * No dedicated Gallery/Studio section on the homepage — `Studio.jsx` (the
 * former "The Studio" feature band) is intentionally unused here but kept in
 * place since nothing else references it; the full gallery lives at the
 * `/gallery` route (linked from the navbar).
 */
export default function Home() {
  const site = useSite()

  return (
    <div className="home-page">
      <Seo
        title="DK StyleHub — Premium Unisex Salon in Coimbatore"
        description="DK StyleHub is a premium unisex beauty and styling studio in Coimbatore — hair, colour, skin and massage for everyone. Book your appointment online."
        path="/"
        jsonLd={[
          salonSchema(site),
          {
            '@type': 'WebSite',
            '@id': WEBSITE_ID,
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            inLanguage: 'en-IN',
            publisher: { '@id': SALON_ID },
          },
        ]}
      />

      <Hero />
      <ServicesPreview />
      <MeetTheTeam />
      <ComboOffers />
      <ProductShowcase />
      <VideoMarquee />
      <CustomerReviews />
      <FooterCta />
    </div>
  )
}
