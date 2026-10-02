import { Download, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Container from '../layout/Container'
import { API_BASE } from '../../lib/api'

export default function BrochureQr() {
  // Same URL the admin Settings QR uses (see BrochureCard in
  // admin/pages/Settings.jsx): the inline PDF endpoint, no ?download=1.
  // The backend streams it with Content-Disposition: inline, so scanning
  // opens the PDF straight in the phone's own viewer — full multi-page
  // scrolling and that viewer's own download/share control — with no
  // in-between wrapper page.
  const brochureUrl = API_BASE.startsWith('http')
    ? `${API_BASE}/brochure`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/brochure`

  return (
    <Container className="pb-[var(--spacing-section)]">
      <div className="grid items-center gap-8 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-10">
        <div className="mx-auto w-fit rounded-[var(--radius-md)] border border-line bg-paper p-4">
          <QRCodeSVG
            value={brochureUrl}
            size={168}
            role="img"
            aria-label="QR code — scan to view the DK StyleHub studio brochure"
          />
        </div>
        <div className="text-center sm:text-left">
          <p className="eyebrow flex items-center justify-center gap-2 sm:justify-start">
            <QrCode size={14} aria-hidden="true" />
            Scan me
          </p>
          <h2 className="mt-3 font-serif leading-[1.1] text-ink text-[clamp(1.5rem,3vw,2rem)]">
            Stylists &amp; prices, in your pocket.
          </h2>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:mx-0">
            Point your phone camera at the code to view the studio brochure
            — every stylist with their photo and services. Always the live
            menu, straight from the studio.
          </p>
          <a href={`${brochureUrl}?download=1`} download className="btn mt-6 no-underline">
            <Download size={15} aria-hidden="true" />
            Download brochure (PDF)
          </a>
        </div>
      </div>
    </Container>
  )
}
