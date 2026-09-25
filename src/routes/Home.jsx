import Hero from '../components/sections/Hero'
import About from '../components/sections/About'
import ServicesPreview from '../components/sections/ServicesPreview'
import MeetTheTeam from '../components/sections/MeetTheTeam'
import ComboOffers from '../components/sections/ComboOffers'
import ProductShowcase from '../components/sections/ProductShowcase'
import VideoMarquee from '../components/sections/VideoMarquee'
import CustomerReviews from '../components/sections/CustomerReviews'
import FooterCta from '../components/sections/FooterCta'

/**
 * Homepage. Fixed section order:
 *   Hero → About → Our Services → Meet the Team → Combo Offers →
 *   Our Products → Video → Reviews → Closing CTA →
 *   (Footer, from RootLayout).
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
  return (
    <div className="home-page">
      <title>DK StyleHub</title>
      <meta
        name="description"
        content="DK StyleHub — a premium unisex beauty and styling studio."
      />

      <Hero />
      <About />
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
