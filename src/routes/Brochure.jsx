import { Download } from 'lucide-react'
import Container from '../components/layout/Container'
import Seo from '../components/Seo'
import { API_BASE } from '../lib/api'

// Matches the inline (viewable) and forced-download variants of the same
// backend endpoint — see BrochureController::show(). Kept as plain template
// strings rather than a shared helper: it's one line, used in exactly two
// places (here and BrochureQr.jsx), and the two call sites want different
// query strings.
const brochureBase = API_BASE.startsWith('http')
  ? `${API_BASE}/brochure`
  : `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/brochure`

/**
 * /brochure — what the QR code on /contact actually points at. Opens as a
 * normal webpage with the studio brochure PDF shown in place, plus an
 * explicit Download button, so scanning the code no longer silently starts
 * a file download (the previous behaviour, when the QR pointed straight at
 * the PDF endpoint).
 */
export default function Brochure() {
  return (
    <>
      <Seo title="Studio Brochure — DK StyleHub" noindex />

      <Container className="section-y">
        <p className="eyebrow">Stylists &amp; prices</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1>Studio Brochure</h1>
          <a
            href={`${brochureBase}?download=1`}
            download
            className="btn no-underline"
          >
            <Download size={15} aria-hidden="true" />
            Download PDF
          </a>
        </div>

        <div className="mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper">
          <iframe
            src={brochureBase}
            title="DK StyleHub studio brochure"
            className="h-[80vh] w-full"
          />
        </div>

        <p className="measure mt-4 text-sm text-ink-soft">
          Preview not loading?{' '}
          <a href={`${brochureBase}?download=1`} download className="text-ink underline underline-offset-2">
            Download the brochure
          </a>{' '}
          directly instead.
        </p>
      </Container>
    </>
  )
}
