import LegalPage from '../components/legal/LegalPage'
import LegalSection from '../components/legal/LegalSection'
import { useSite } from '../context/SiteContext'
import Seo from '../components/Seo'
import { breadcrumbSchema } from '../lib/seo'

// Bump by hand whenever this page's content changes — see Terms.jsx for the
// same convention.
const LAST_UPDATED = 'October 1, 2026'

const CONTENTS = [
  ['information-we-collect', 'Information We Collect'],
  ['how-we-use-information', 'How We Use Your Information'],
  ['payment-processing', 'Payment Processing & Razorpay'],
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
 * /privacy — same shape as Terms.jsx (LegalPage shell with its table of
 * contents, LegalSection blocks) so the two documents read as one system.
 *
 * Every data point named below is one this codebase actually collects/uses
 * — see StoreAppointmentRequest and the razorpay_order_id/razorpay_payment_id
 * columns on appointments — plus the actual localStorage/sessionStorage keys
 * the public site writes (ThemeContext, CartContext), and the Google Analytics tag
 * (vite.config.js's googleAnalytics(), production builds only — see
 * VITE_GA_ID). Nothing about ad tracking or third parties beyond
 * Razorpay/Google is claimed, because none currently exists in this app.
 */
export default function Privacy() {
  const site = useSite()

  return (
    <>
      <Seo
        title="Privacy Policy — DK StyleHub"
        description="How DK StyleHub collects, uses and protects your information when you use this website and book appointments."
        path="/privacy"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Privacy Policy', path: '/privacy' },
        ])}
      />

      <LegalPage
        title="Privacy Policy"
        lastUpdated={LAST_UPDATED}
        contents={CONTENTS}
        intro={
          <>
            This policy explains what information {site.name} collects through this website, why,
            and how it&rsquo;s used. It&rsquo;s written to describe this website&rsquo;s actual
            practices in plain language, and is not a claim of compliance with any specific data
            protection law.
          </>
        }
      >
        <LegalSection id="information-we-collect" title="1. Information We Collect">
          <p>We collect information you provide directly:</p>
          <ul>
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
            <li>Create, confirm and manage your appointment bookings</li>
            <li>Contact you about a booking (for example, to confirm or follow up)</li>
            <li>Keep a record of completed and upcoming appointments</li>
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

        <LegalSection id="cookies-local-storage" title="4. Cookies & Local Storage">
          <p>
            This website does not use advertising cookies. It uses Google Analytics to
            understand how the site is used (pages viewed, general location, device type), which
            sets its own cookies for that purpose — see{' '}
            <a href="#third-parties" className="text-ink underline underline-offset-2">
              Service Providers &amp; Third Parties
            </a>{' '}
            below. It also uses your browser&rsquo;s local storage to make the site work:
          </p>
          <ul>
            <li>
              <strong>Local storage</strong> — remembers your light/dark theme preference and
              the items in your cart
            </li>
            <li>
              <strong>Session storage</strong> — temporarily holds a &ldquo;Buy Now&rdquo;
              selection while you check out
            </li>
          </ul>
          <p>
            This data stays in your browser and is cleared when you clear your browser&rsquo;s
            site data.
          </p>
        </LegalSection>

        <LegalSection id="third-parties" title="5. Service Providers & Third Parties">
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
              <strong>Google Analytics</strong> — to understand how visitors use this website.
              We have not enabled Google Signals or ad personalisation, so this data is not used
              to show you ads. You can opt out using{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2"
              >
                Google&rsquo;s browser opt-out add-on
              </a>
              . Google&rsquo;s own privacy policy governs its handling of this data.
            </li>
          </ul>
          <p>
            We do not sell your personal information, and do not share it with third parties
            for their own marketing purposes.
          </p>
        </LegalSection>

        <LegalSection id="data-retention" title="6. Data Retention">
          <p>
            We keep your booking information so the studio can manage your appointments.
            [Placeholder — add the business&rsquo;s specific retention period for booking
            records, once decided.]
          </p>
        </LegalSection>

        <LegalSection id="security" title="7. Security">
          <p>
            Staff passwords are stored using industry-standard hashing, and access to admin
            tools is restricted by role-based permissions. No method of storing or transmitting data
            online is completely secure, and we cannot guarantee absolute security.
          </p>
        </LegalSection>

        <LegalSection id="your-rights" title="8. Your Rights & Requests">
          <p>
            To request a copy of, correction to, or deletion of your personal information,
            contact us using the details below.
          </p>
        </LegalSection>

        <LegalSection id="children" title="9. Children's Privacy">
          <p>
            This website is intended for adults booking salon services and is not directed at
            children. We do not knowingly collect information from children.
          </p>
        </LegalSection>

        <LegalSection id="changes" title="10. Changes to This Policy">
          <p>
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at
            the top of this page reflects the most recent revision.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="11. Contact Us">
          <p>For privacy questions or requests, contact:</p>
          <ul>
            <li>{site.name}, {site.address}</li>
            {site.phone && <li>Phone: {site.phone.display}</li>}
            <li>Email: [privacy contact email to be added]</li>
          </ul>
        </LegalSection>
      </LegalPage>
    </>
  )
}
