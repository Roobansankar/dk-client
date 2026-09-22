import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { useGalleryImages } from '../../context/GalleryContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Gallery" preview: an image-led, lightly asymmetric preview drawn
 * from the live `GET /api/gallery` feed (via useGallery), with the static set
 * as a fallback. Links through to the full /gallery page. No cards, no
 * borders — one quiet hover zoom.
 *
 * Layout: a wide lead image, then a clean three-up row.
 */
export default function GalleryPreview() {
  const { items, loading } = useGalleryImages()
  const [failed, setFailed] = useState(() => new Set())

  const markFailed = (id) => setFailed((prev) => new Set(prev).add(id))

  const visible = items.filter((item) => !failed.has(item.id)).slice(0, 4)

  if (!loading && visible.length === 0) return null

  const [lead, ...rest] = visible

  return (
    <section id="gallery-preview" className="scroll-mt-24 border-t border-line bg-paper">
      <Container className="section-y">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="measure">
            <p className="eyebrow">Gallery</p>
            <h2 className="mt-4">Inside the studio</h2>
            <p className="mt-4 text-ink-soft">Cuts, colour and the space itself.</p>
          </div>
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-eyebrow uppercase tracking-[0.14em] text-ink no-underline transition-colors hover:text-muted"
          >
            View the gallery
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <>
            <Skeleton className="mt-12 aspect-[16/10] w-full sm:mt-14 sm:aspect-[16/7]" />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          </>
        ) : (
          <>
            {lead && (
              <figure className="group mt-12 overflow-hidden bg-surface-sunken sm:mt-14">
                <img
                  src={lead.src}
                  alt={lead.alt}
                  loading="eager"
                  onError={() => markFailed(lead.id)}
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:aspect-[16/7]"
                />
              </figure>
            )}
            {rest.length > 0 && (
              <div
                className={clsx(
                  'mt-3 grid gap-3 sm:mt-4 sm:gap-4',
                  rest.length >= 3
                    ? 'grid-cols-2 sm:grid-cols-3'
                    : 'grid-cols-2',
                )}
              >
                {rest.map((item) => (
                  <figure
                    key={item.id}
                    className="group overflow-hidden bg-surface-sunken"
                  >
                    <img
                      src={item.src}
                      alt={item.alt}
                      onError={() => markFailed(item.id)}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  </figure>
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  )
}
