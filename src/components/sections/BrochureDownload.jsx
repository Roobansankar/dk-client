import { Download } from 'lucide-react'
import Container from '../layout/Container'
import { API_BASE } from '../../lib/api'

export default function BrochureDownload() {
  const brochureUrl = API_BASE.startsWith('http')
    ? `${API_BASE}/brochure`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/brochure`

  return (
    <Container className="pb-[var(--spacing-section)]">
      <div className="flex flex-col items-center gap-6 rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-center sm:p-10">
        <div>
          <h2 className="font-serif leading-[1.1] text-ink text-[clamp(1.5rem,3vw,2rem)]">
            Stylists &amp; prices, in your pocket.
          </h2>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
            Every stylist with their photo and services, at their own prices — always the live
            menu, straight from the studio.
          </p>
        </div>
        <a href={`${brochureUrl}?download=1`} download className="btn no-underline">
          <Download size={15} aria-hidden="true" />
          Download brochure (PDF)
        </a>
      </div>
    </Container>
  )
}
