import Container from '../components/layout/Container'
import LegalSection from '../components/legal/LegalSection'
import { useSite } from '../context/SiteContext'
import Seo from '../components/Seo'

// Bump by hand whenever this page's content changes — see Terms.jsx for the
// same convention.
const LAST_UPDATED = 'September 17, 2026'

const CONTENTS = [
  ['information-we-collect', 'Information We Collect'],
  ['how-we-use-information', 'How We Use Your Information'],
  ['payment-processing', 'Payment Processing & Razorpay'],
  ['google-sign-in', 'Google Sign-In'],
  ['cookies-local-storage', 'Cookies & Local Storage'],
  ['third-parties', 'Service Providers & Third Parties'],
  ['data-retention', 'Data Retention'],
  ['security', 'Security'],
  ['your-rights', 'Your Rights & Requests'],
  ['children', "Children's Privacy"],
  ['changes', 'Changes to This Policy'],
  ['contact', 'Contact Us'],
]

/**
 * /privacy — same shape as Terms.jsx (plain article, table of contents,
 * LegalSection blocks) so the two documents read as one system.
 *
 * Every data point named below is one this codebase actually collects/uses
 * — see RegisterRequest, StoreAppointmentRequest, GoogleAuthController and
 * the razorpay_order_id/razorpay_payment_id columns on appointments — plus
 * the actual localStorage/sessionStorage keys the frontend writes (lib/api.js,
 * ThemeContext, Booking.jsx, GoogleButton.jsx). Nothing about analytics,
 * ad tracking or third parties beyond Razorpay/Google is claimed, because
 * none currently exists in this app.
 */
export default function Privacy() {
  const site = useSite()

  return (
    <>
      <Seo
        title="Privacy Policy — DK StyleHub"
        description="How DK StyleHub collects, uses and protects your information when you use this website and book appointments."
        path="/privacy"
      />

      <Container as="article" className="section-y">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-4">Privacy Policy</h1>
        <p className="measure mt-4 text-ink-soft">
          This policy explains what information {site.name} collects through this website, why,
          and how it&rsquo;s used. It&rsquo;s written to describe this website&rsquo;s actual
          practices in plain language, and is not a claim of compliance with any specific data
          protection law.
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
          <LegalSection id="information-we-collect" title="1. Information We Collect">
            <p>We collect information you provide directly:</p>
            <ul>
              <li>
                <strong>Account information</strong> — name, email address, and (optionally)
                phone number when you register, or your name and email if you sign in with
                Google
              </li>
              <li>
                <strong>Booking information</strong> — the name, phone number and gender you
                provide for an appointment, plus the service, category, stylist and date/time
                you select
              </li>
              <li>
                <strong>Payment information</strong> — a payment reference and status from
                Razorpay when you pay a booking&rsquo;s advance amount (see{' '}
                <a href="#payment-processing" className="text-ink underline underline-offset-2">
                  Payment Processing &amp; Razorpay
                </a>
                )
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="how-we-use-information" title="2. How We Use Your Information">
            <p>We use this information to:</p>
            <ul>
              <li>Create and manage your account</li>
              <li>Create, confirm and manage your appointment bookings</li>
              <li>Contact you about a booking (for example, to confirm or follow up)</li>
              <li>Keep a record of completed and upcoming appointments in your account</li>
            </ul>
          </LegalSection>

          <LegalSection id="payment-processing" title="3. Payment Processing & Razorpay">
            <p>
              Advance payments are processed by Razorpay, a third-party payment gateway. Your
              card, UPI or net-banking details are entered directly into Razorpay&rsquo;s
              checkout and are never seen or stored by {site.name}. We store only the Razorpay
              order and payment reference IDs and the resulting payment status, so we can confirm
              your booking. Razorpay&rsquo;s own privacy policy governs its handling of your
              payment details.
            </p>
          </LegalSection>

          <LegalSection id="google-sign-in" title="4. Google Sign-In">
            <p>
              If you choose &ldquo;Continue with Google&rdquo;, Google shares your name and email
              address with us to create or sign in to your account. We don&rsquo;t receive your
              Google password, and this is governed by Google&rsquo;s own privacy policy as well
              as this one.
            </p>
          </LegalSection>

          <LegalSection id="cookies-local-storage" title="5. Cookies & Local Storage">
            <p>This website does not use advertising or analytics cookies. It does use your browser&rsquo;s local storage to make the site work:</p>
            <ul>
              <li>
                <strong>Local storage</strong> — keeps you signed in between visits, and remembers
                your light/dark theme preference
              </li>
              <li>
                <strong>Session storage</strong> — temporarily holds an in-progress booking form
                (so it survives the sign-in step) and where to return you to after signing in
              </li>
            </ul>
            <p>
              This data stays in your browser and is cleared when you sign out or clear your
              browser&rsquo;s site data.
            </p>
          </LegalSection>

          <LegalSection id="third-parties" title="6. Service Providers & Third Parties">
            <p>We share information with third parties only where needed to run this website:</p>
            <ul>
              <li>
                <strong>Razorpay</strong> — to process advance payments (see{' '}
                <a href="#payment-processing" className="text-ink underline underline-offset-2">
                  above
                </a>
                )
              </li>
              <li>
                <strong>Google</strong> — if you choose to sign in with Google
              </li>
            </ul>
            <p>
              We do not sell your personal information, and do not share it with third parties
              for their own marketing purposes.
            </p>
          </LegalSection>

          <LegalSection id="data-retention" title="7. Data Retention">
            <p>
              We keep your account and booking information for as long as your account is active,
              so you can view your appointment history. [Placeholder — add the business&rsquo;s
              specific retention period for account/booking records after account closure, once
              decided.]
            </p>
          </LegalSection>

          <LegalSection id="security" title="8. Security">
            <p>
              Passwords are stored using industry-standard hashing, and access to admin tools is
              restricted by role-based permissions. No method of storing or transmitting data
              online is completely secure, and we cannot guarantee absolute security.
            </p>
          </LegalSection>

          <LegalSection id="your-rights" title="9. Your Rights & Requests">
            <p>
              You can review and update your account details from your account page at any time.
              To request a copy of, correction to, or deletion of your personal information,
              contact us using the details below.
            </p>
          </LegalSection>

          <LegalSection id="children" title="10. Children's Privacy">
            <p>
              This website is intended for adults booking salon services and is not directed at
              children. We do not knowingly collect information from children.
            </p>
          </LegalSection>

          <LegalSection id="changes" title="11. Changes to This Policy">
            <p>
              We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at
              the top of this page reflects the most recent revision.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="12. Contact Us">
            <p>For privacy questions or requests, contact:</p>
            <ul>
              <li>{site.name}, {site.address}</li>
              {site.phone && <li>Phone: {site.phone.display}</li>}
              <li>Email: [privacy contact email to be added]</li>
            </ul>
          </LegalSection>
        </div>
      </Container>
    </>
  )
}
