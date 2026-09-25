import BookingSection from '../components/sections/Booking'

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
      <title>Book an Appointment — DK StyleHub</title>
      <meta
        name="description"
        content="Book an appointment at DK StyleHub — choose a service, stylist, date and time."
      />

      <BookingSection />
    </>
  )
}
