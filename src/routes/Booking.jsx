import BookingSection from '../components/sections/Booking'
import Seo from '../components/Seo'

/**
 * Dedicated booking page (/booking).
 *
 * The appointment form previously lived as a section on the homepage
 * (`/#booking`). It now has its own page so every "Book Appointment"
 * button across the site lands here instead of scrolling the homepage.
 * Service deep-links (`state.prefill`) keep working — BookingSection
 * reads them from the location state.
 */
export default function Booking() {
  return (
    <>
      <Seo
        title="Book an Appointment — DK StyleHub, Coimbatore"
        description="Book your DK StyleHub appointment online — choose a service, your stylist, and a date and time that suits you."
        path="/booking"
      />

      <BookingSection />
    </>
  )
}
