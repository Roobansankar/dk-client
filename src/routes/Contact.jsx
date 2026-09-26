import { Link } from 'react-router-dom'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Container from '../components/layout/Container'
import FooterCta from '../components/sections/FooterCta'
import ReviewUs from '../components/sections/ReviewUs'
import { useSite } from '../context/SiteContext'
import { formatTime12h } from '../lib/time'
import contactBanner from '../assets/images/Contact-banner.webp'
import Seo from '../components/Seo'
import { assetUrl } from '../lib/seo'

const BOOKING = '/booking'

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.3702896175228!2d76.9602525!3d11.0108196!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba8590ebe89bbe7%3A0x57fd23b2ccdef8c9!2sThe_DK%20Stylehub!5e0!3m2!1sen!2sin!4v1788590356951!5m2!1sen!2sin'

/** One direct-contact action — an icon, a label, and a link. Only rendered
 *  when the underlying detail actually exists (see Contact()'s guards). */
function ContactAction({ icon: Icon, label, value, href }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
      className="group flex items-center gap-4 border-t border-white/10 py-5 no-underline transition-colors first:border-t-0 hover:bg-white/[0.03]"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors group-hover:border-white/40 group-hover:text-white"
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="flex flex-col">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/50">
          {label}
        </span>
        <span className="mt-0.5 text-white transition-colors group-hover:text-accent">
          {value}
        </span>
      </span>
    </a>
  )
}

/**
 * Contact route (/contact) — a premium dark editorial page: a photographic
 * hero (the studio, scrim-darkened — same treatment as Products.jsx's
 * full-bleed bands), a direct-contact / visit-us split, the studio's actual
 * Google Maps location, then the same closing CTA panel every other page
 * ends on (see FooterCta.jsx) before the global Footer.
 *
 * Shows only details that actually exist in src/data/site.js or the live
 * `site-settings` API — nothing about address, hours or email is invented.
 * There is no backend endpoint to submit a contact-us message to (see
 * routes/api.php), so this deliberately offers direct actions — call,
 * WhatsApp, email — rather than a form with nowhere to send itself.
 */
export default function Contact() {
  const { phone, email, address, hours, shopOpensAt, shopClosesAt, socials } = useSite()
  const whatsapp = socials.find((s) => s.label === 'WhatsApp')
  const isHHMM = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
  const opensAt = isHHMM(shopOpensAt) ? formatTime12h(shopOpensAt) : null
  const closesAt = isHHMM(shopClosesAt) ? formatTime12h(shopClosesAt) : null

  return (
    <>
      <Seo
        title="Contact & Location — DK StyleHub Salon, Coimbatore"
        description="Call, message or visit DK StyleHub in Coimbatore. Find the studio on Google Maps and check the shop hours before you come in."
        path="/contact"
        image={assetUrl(contactBanner)}
        imageAlt="The DK StyleHub studio — arched styling stations and chairs under warm light"
      />

      {/* Hero — the studio under a dark scrim, same recipe as Products.jsx's
          full-bleed bands (bg-scrim + a cool-tinted wash + a top-to-bottom
          gradient), just at banner rather than campaign scale. `btn-solid-light`
          / `btn-on-dark` are the sitewide fixed-tone buttons for sitting on
          photography, unaffected by theme. */}
      <section className="relative overflow-hidden bg-scrim text-white">
        <img
          src={contactBanner}
          alt="The DK StyleHub studio — arched styling stations and chairs under warm light"
          loading="eager"
          fetchPriority="high"
          className="h-[46svh] min-h-[20rem] w-full object-cover object-[50%_60%] lg:h-[52svh]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-[#3f4a5f]/12" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-scrim/50 via-scrim/15 to-scrim/70"
        />
        <Container className="absolute inset-0">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/75 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
              Contact
            </p>
            <h1 className="mt-5 max-w-[16ch] font-serif leading-[1.03] text-white text-[clamp(2.25rem,6vw,4rem)] [text-shadow:0_2px_30px_rgb(0_0_0/0.45)]">
              Get in touch.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 [text-shadow:0_1px_10px_rgb(0_0_0/0.45)] sm:text-lg">
              For appointments, questions, or anything else — reach the studio
              directly, or book online and we will confirm your time.
            </p>
            <Link to={BOOKING} className="btn btn-solid-light mt-8 rounded-full no-underline">
              Book Appointment
            </Link>
          </div>
        </Container>
      </section>

      {/* Direct contact / visit-us split. The left panel stays on the hero's
          dark ground (bg-scrim) rather than switching to the page's light
          theme surface — an intentional continuation of the hero, and why
          its type is fixed white/accent rather than the ink/paper tokens. */}
      <div className="texture-lines">
        <Container className="section-y">
          <div className="grid gap-0 overflow-hidden rounded-[var(--radius-lg)] border border-line lg:grid-cols-12">
            <div
              className="bg-scrim px-6 py-10 text-white sm:px-10 sm:py-12 lg:col-span-5"
              style={{ '--color-accent': '#c9a878' }}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/50">
                Reach us directly
              </p>
              <h2 className="mt-4 max-w-[20ch] font-serif leading-[1.1] text-white text-[clamp(1.5rem,3vw,2rem)]">
                However suits you best.
              </h2>

              <div className="mt-6">
                {phone && (
                  <ContactAction
                    icon={Phone}
                    label="Call"
                    value={phone.display}
                    href={phone.href}
                  />
                )}
                {whatsapp && (
                  <ContactAction
                    icon={MessageCircle}
                    label="WhatsApp"
                    value="Message the studio"
                    href={whatsapp.href}
                  />
                )}
                {email && (
                  <ContactAction icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
                )}
                {address && (
                  <ContactAction icon={MapPin} label="Address" value={address} href="#studio-map" />
                )}
              </div>

              {(opensAt || closesAt) && (
                <dl className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/50">
                    Shop hours
                  </p>
                  {opensAt && (
                    <div className="mt-2 flex items-baseline justify-between gap-6 text-sm">
                      <dt className="text-white/60">Shop opens at</dt>
                      <dd className="tabular-nums text-white">{opensAt}</dd>
                    </div>
                  )}
                  {closesAt && (
                    <div className="mt-1 flex items-baseline justify-between gap-6 text-sm">
                      <dt className="text-white/60">Shop closes at</dt>
                      <dd className="tabular-nums text-white">{closesAt}</dd>
                    </div>
                  )}
                </dl>
              )}

              {hours && (
                <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-relaxed text-white/60">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/50">
                    Hours
                  </span>
                  <br />
                  {hours}
                </p>
              )}

              {!address && !hours && !opensAt && !closesAt && (
                <p className="mt-6 border-t border-white/10 pt-5 text-xs text-white/45">
                  Studio address and opening hours will be listed here once
                  confirmed.
                </p>
              )}
            </div>

            {/* Visit us — the studio's actual Google Maps location. */}
            <div id="studio-map" className="scroll-mt-24 bg-surface-sunken p-6 sm:p-10 lg:col-span-7">
              <p className="eyebrow">Visit the studio</p>
              {address ? (
                <p className="mt-4 max-w-prose text-ink-soft">{address}</p>
              ) : (
                <p className="mt-4 max-w-prose text-ink-soft">
                  Find DK StyleHub on the map below — search directions right
                  from Google Maps.
                </p>
              )}

              <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-line sm:aspect-[16/10]">
                <iframe
                  src={MAP_EMBED_SRC}
                  title="DK StyleHub location on Google Maps"
                  className="absolute inset-0 h-full w-full"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          </div>
        </Container>
      </div>

      <ReviewUs />

      <FooterCta />
    </>
  )
}
