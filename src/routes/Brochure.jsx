import { Download } from 'lucide-react'
import Container from '../components/layout/Container'
import Seo from '../components/Seo'
import { Skeleton, StatusLine } from '../components/StateViews'
import { useApiResource } from '../hooks/useApi'
import { formatInr } from '../data/services'
import { API_BASE } from '../lib/api'

const brochureUrl = API_BASE.startsWith('http')
  ? `${API_BASE}/brochure`
  : `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/brochure`

function ServiceGroup({ title, groups }) {
  if (groups.length === 0) return null

  return (
    <div className="mt-5">
      <p className="eyebrow">{title}</p>
      {groups.map((group) => (
        <div key={group.category} className="mt-4">
          <h3 className="font-serif text-lg text-ink">{group.category}</h3>
          <ul className="mt-1">
            {group.services.map((service) => (
              <li
                key={service.name}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 first:border-t"
              >
                <span className="text-ink-soft">{service.name}</span>
                {service.price != null && (
                  <span className="shrink-0 tabular-nums text-ink">{formatInr(service.price)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function StylistSection({ stylist }) {
  return (
    <section className="mt-12 border-t border-line pt-10 first:mt-8 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-4">
        {stylist.photoUrl ? (
          <img
            src={stylist.photoUrl}
            alt={stylist.name}
            className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-serif text-xl text-ink"
            aria-hidden="true"
          >
            {stylist.initial}
          </div>
        )}
        <div>
          <h2 className="font-serif text-2xl text-ink">{stylist.name}</h2>
          {stylist.bio && <p className="mt-1 text-sm text-ink-soft">{stylist.bio}</p>}
        </div>
      </div>

      <ServiceGroup title="Men" groups={stylist.men} />
      <ServiceGroup title="Women" groups={stylist.women} />
    </section>
  )
}

/**
 * /brochure — what the QR code on the admin Settings print QR points at.
 * A plain scrollable webpage (every stylist, one after another, services
 * grouped underneath), not a PDF: phones vary wildly in how well they
 * render a multi-page PDF opened directly, but a normal webpage just works
 * everywhere the same way. The actual PDF stays one tap away for anyone who
 * wants the file itself.
 */
export default function Brochure() {
  const { data, loading, error, reload } = useApiResource('/brochure-data')

  return (
    <>
      <Seo title="Studio Brochure — DK StyleHub" noindex />

      <Container className="section-y">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Stylists &amp; prices</p>
            <h1 className="mt-4">Studio Brochure</h1>
          </div>
          <a href={`${brochureUrl}?download=1`} download className="btn no-underline">
            <Download size={15} aria-hidden="true" />
            Download PDF
          </a>
        </div>

        {loading && (
          <div className="mt-10 measure" aria-hidden="true">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="mt-4 h-6 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        )}
        {!loading && error && (
          <StatusLine className="mt-10">
            Couldn’t load the brochure.{' '}
            <button type="button" onClick={reload} className="text-ink underline underline-offset-2">
              Try again
            </button>
            .
          </StatusLine>
        )}
        {!loading && !error && data && data.stylists.length === 0 && (
          <StatusLine className="mt-10">No stylists to show yet.</StatusLine>
        )}
        {!loading && !error && data && data.stylists.length > 0 && (
          <div className="measure">
            {data.stylists.map((stylist) => (
              <StylistSection key={stylist.name} stylist={stylist} />
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
