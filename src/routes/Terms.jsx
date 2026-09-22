import Container from '../components/layout/Container'
import LegalSection from '../components/legal/LegalSection'
import { useSite } from '../context/SiteContext'

// Kept as a single readable constant rather than computed from `new Date()`
// on every render — bump it by hand whenever this page's content changes.
const LAST_UPDATED = 'September 17, 2026'

const CONTENTS = [
  ['website-usage', 'Website Usage'],
  ['accounts', 'Account Registration'],
  ['booking', 'Appointment Booking'],
  ['confirmation', 'Appointment Confirmation'],
  ['rescheduling-cancellation', 'Rescheduling & Cancellation'],
  ['payments', 'Advance Payments & Payment Processing'],
  ['no-show', 'No-Shows & Late Arrivals'],
  ['availability-pricing', 'Service Availability & Pricing'],
  ['responsibilities', 'Your Responsibilities'],
  ['ownership', 'Website & Content Ownership'],
  ['liability', 'Limitation of Liability'],
  ['changes', 'Changes to Services or These Terms'],
  ['governing-law', 'Governing Law'],
  ['contact', 'Contact Us'],
]

/**
 * /terms — plain editorial text page (no hero), matching NotFound.jsx's
 * lightweight shape rather than Contact.jsx's photographic one; a legal
 * document reads better as quiet body copy than as a campaign section.
 *
 * Content is scoped to what this codebase actually does (see StoreAppointment
 * Request, RazorpayPaymentTest, GoogleAuthController) — nothing about
 * registration numbers, GST, or a specific legal entity is invented; those
 * are left as bracketed placeholders for the business to fill in.
 */
export default function Terms() {
  const site = useSite()

  return (
    <>
      <title>Terms & Conditions — DK StyleHub</title>
      <meta
        name="description"
        content="The terms and conditions for using the DK StyleHub website and booking appointments online."
      />

      <Container as="article" className="section-y">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-4">Terms & Conditions</h1>
        <p className="measure mt-4 text-ink-soft">
          These terms govern your use of the {site.name} website and the booking of appointments
          through it. This page is website legal content, not legal advice — for questions about
          your specific situation, please speak with us directly or consult a qualified advisor.
        </p>
        <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

        <nav aria-label="Table of contents" className="surface measure mt-10 p-6">
          <p className="eyebrow">On this page</p>
          <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {CONTENTS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="text-sm text-ink-soft no-underline hover:text-ink">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-10 sm:space-y-12">
          <LegalSection id="website-usage" title="1. Website Usage">
            <p>
              By browsing this website or creating an account, you agree to use it only for
              lawful purposes — to learn about {site.name}&rsquo;s services, products and pricing,
              and to book appointments. You agree not to misuse the site: attempting to
              disrupt it, access accounts that aren&rsquo;t yours, or submit false information.
            </p>
          </LegalSection>

          <LegalSection id="accounts" title="2. Account Registration">
            <p>
              Booking an appointment online requires a customer account. You can register with
              your name, email and (optionally) phone number, or sign in with Google. You are
              responsible for keeping your login credentials confidential and for all activity
              under your account. Please provide accurate, current information when
              registering or booking.
            </p>
          </LegalSection>

          <LegalSection id="booking" title="3. Appointment Booking">
            <p>To book an appointment you&rsquo;ll be asked for:</p>
            <ul>
              <li>Your name and phone number</li>
              <li>The service category, service and (where applicable) stylist</li>
              <li>Your preferred appointment date and time</li>
            </ul>
            <p>
              Bookings are subject to slot and stylist availability at the time of confirmation,
              and to the studio&rsquo;s posted opening hours.
            </p>
          </LegalSection>

          <LegalSection id="confirmation" title="4. Appointment Confirmation">
            <p>
              An appointment is confirmed only once it has been successfully submitted and, where
              an advance payment is required, that payment has been received (see{' '}
              <a href="#payments" className="text-ink underline underline-offset-2">
                Advance Payments &amp; Payment Processing
              </a>
              ). Submitting a booking request does not by itself guarantee a slot until this
              confirmation step is complete.
            </p>
          </LegalSection>

          <LegalSection id="rescheduling-cancellation" title="5. Rescheduling & Cancellation">
            <p>
              If you need to reschedule or cancel an appointment, please contact the studio
              directly (see{' '}
              <a href="#contact" className="text-ink underline underline-offset-2">
                Contact Us
              </a>
              ) as early as possible so the slot can be offered to another customer. [Placeholder
              — add the business&rsquo;s specific notice period and any cancellation/refund
              conditions for advance payments once decided.]
            </p>
          </LegalSection>

          <LegalSection id="payments" title="6. Advance Payments & Payment Processing">
            <p>
              Certain bookings require an advance payment (a confirmation fee) to secure the
              appointment. This payment is processed through Razorpay, a third-party payment
              gateway. {site.name} does not collect or store your card, UPI or net-banking
              details — these are handled directly by Razorpay under its own terms and privacy
              policy. We retain only the payment reference and status needed to confirm your
              booking.
            </p>
          </LegalSection>

          <LegalSection id="no-show" title="7. No-Shows & Late Arrivals">
            <p>
              Please arrive on time for your appointment. [Placeholder — add the business&rsquo;s
              specific policy for no-shows and late arrivals, including whether any advance
              payment is forfeited or adjusted, once decided.]
            </p>
          </LegalSection>

          <LegalSection id="availability-pricing" title="8. Service Availability & Pricing">
            <p>
              Services, stylists and pricing shown on this website reflect current offerings and
              may change without prior notice. We aim to keep this information accurate, but the
              price and details confirmed at the time of your booking will apply.
            </p>
          </LegalSection>

          <LegalSection id="responsibilities" title="9. Your Responsibilities">
            <p>
              You agree to provide accurate booking and contact details, to inform us in advance
              of any allergies, sensitivities or conditions relevant to the service you&rsquo;ve
              booked, and to treat studio staff and other customers with respect.
            </p>
          </LegalSection>

          <LegalSection id="ownership" title="10. Website & Content Ownership">
            <p>
              The {site.name} name, logo, photography and written content on this website belong
              to {site.name} unless otherwise credited, and may not be copied or reused without
              permission.
            </p>
          </LegalSection>

          <LegalSection id="liability" title="11. Limitation of Liability">
            <p>
              This website and its content are provided on an &ldquo;as is&rdquo; basis. To the
              extent permitted by law, {site.name} is not liable for indirect or consequential
              losses arising from your use of the website or its booking system, including
              temporary unavailability of the site or booking errors caused by incorrect
              information you provide.
            </p>
          </LegalSection>

          <LegalSection id="changes" title="12. Changes to Services or These Terms">
            <p>
              We may update these terms, our services or our pricing from time to time. The
              &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent
              revision. Continued use of the website after changes are posted means you accept
              the updated terms.
            </p>
          </LegalSection>

          <LegalSection id="governing-law" title="13. Governing Law">
            <p>
              These terms are governed by the laws of India, and any disputes will be subject to
              the exclusive jurisdiction of the courts of Coimbatore, Tamil Nadu — the studio&rsquo;s
              registered location.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="14. Contact Us">
            <p>Questions about these terms can be sent to:</p>
            <ul>
              <li>{site.name}, {site.address}</li>
              {site.phone && <li>Phone: {site.phone.display}</li>}
              <li>Email: [business email to be added]</li>
            </ul>
          </LegalSection>
        </div>
      </Container>
    </>
  )
}
