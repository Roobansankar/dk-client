import { Download, Eye } from 'lucide-react'
import Container from '../components/layout/Container'
import Seo from '../components/Seo'
import { API_BASE } from '../lib/api'

// Matches the inline (viewable) and forced-download variants of the same
// backend endpoint — see BrochureController::show().
const brochureUrl = API_BASE.startsWith('http')
  ? `${API_BASE}/brochure`
  : `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/brochure`

/**
 * /brochure — what the QR code on Home, Contact and the admin Settings
 * print QR all point at. Some phones' own inline PDF viewer only renders
 * the first page of a large multi-page PDF opened directly, so rather than
 * gamble on that, this page offers two plain, explicit choices: open the
 * PDF (same native viewer, but the visitor chose it and can try again/use
 * a different app) or download it outright (always opens complete, since
 * it's a finished local file by the time anything reads it).
 */
export default function Brochure() {
  return (
    <>
      <Seo title="Studio Brochure — DK StyleHub" noindex />

      <Container className="section-y">
        <p className="eyebrow">Stylists &amp; prices</p>
        <h1 className="mt-4">Studio Brochure</h1>
        <p className="measure mt-3 text-ink-soft">
          Every stylist with their photo and services, at their own prices.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={brochureUrl} target="_blank" rel="noreferrer" className="btn btn-outline no-underline">
            <Eye size={15} aria-hidden="true" />
            View PDF
          </a>
          <a href={`${brochureUrl}?download=1`} download className="btn no-underline">
            <Download size={15} aria-hidden="true" />
            Download PDF
          </a>
        </div>
      </Container>
    </>
  )
}
