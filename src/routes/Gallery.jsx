import { useCallback, useMemo, useState } from 'react'
import Container from '../components/layout/Container'
import { useGalleryImages } from '../context/GalleryContext'
import { galleryItems as staticGallery } from '../data/gallery'
import { Skeleton, StatusLine } from '../components/StateViews'
import GalleryWheel from '../components/gallery/GalleryWheel'
import GalleryMasonry from '../components/gallery/GalleryMasonry'
import Lightbox from '../components/gallery/Lightbox'

// The bundled sample set, normalised to the `{ id, src, alt }` shape the
// sections render. Used when the live feed's images can't be displayed.
const STATIC_GALLERY = staticGallery.map((item) => ({
  id: item.id,
  src: item.src,
  alt: item.alt || '',
}))

/**
 * Gallery route (/gallery). Two sections built from the same `GET /api/gallery`
 * feed (static set as the fallback, via useGallery):
 *
 *   1. GalleryWheel   — a dark, cinematic auto-scrolling perspective wheel.
 *   2. GalleryMasonry — an asymmetric editorial grid.
 *
 * A single click on any image opens it in the shared <Lightbox>, which then
 * steps through `visible` with its edge arrows / arrow keys.
 * Per-image load failures are tracked here and removed from both sections.
 */
export default function Gallery() {
  const { items, loading, error } = useGalleryImages()
  const [failed, setFailed] = useState(() => new Set())
  const [activeIndex, setActiveIndex] = useState(null)

  const markFailed = useCallback((id) => {
    setFailed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  // Every image from the live feed failed to load (e.g. the storage symlink is
  // missing on the server, or the records point at files that aren't on disk).
  // Fall back to the bundled sample set — the same graceful degradation
  // useGallery already applies on a network error or an empty feed — instead of
  // collapsing the whole page to its empty state.
  const feedImagesAllFailed =
    !loading && items.length > 0 && items.every((item) => failed.has(item.id))

  const source = feedImagesAllFailed ? STATIC_GALLERY : items

  const visible = useMemo(
    () => source.filter((item) => !failed.has(item.id)),
    [source, failed],
  )

  const openImage = useCallback(
    (item) => setActiveIndex(visible.findIndex((entry) => entry.id === item.id)),
    [visible],
  )
  const nothingToShow = !loading && visible.length === 0

  return (
    <>
      <title>Gallery — DK StyleHub</title>
      <meta
        name="description"
        content="Gallery — DK StyleHub, a premium unisex beauty and styling studio."
      />

      {loading ? (
        <GallerySkeleton />
      ) : nothingToShow ? (
        <div className="texture-lines">
          <Container className="section-y">
            <header className="measure">
              <p className="eyebrow">Gallery</p>
              <h1 className="mt-4">A glimpse of salon life</h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                The studio’s photography is on its way — check back soon.
              </p>
            </header>
          </Container>
        </div>
      ) : (
        <>
          <GalleryWheel
            items={visible}
            onOpen={openImage}
            onImageError={markFailed}
            heading="A glimpse of salon life"
            blurb="Cuts, colour and styling — and the space itself, drifting past like a lookbook."
          />

          <div className="texture-lines">
            <Container className="section-y">
              {(error || feedImagesAllFailed) && (
                <StatusLine className="mb-8">
                  Showing a sample gallery — the latest photos couldn’t be loaded.
                </StatusLine>
              )}

              <header className="measure">
                <p className="eyebrow">Selected work</p>
                <h2 className="mt-4">Every corner, every finish</h2>
                <p className="mt-4 leading-relaxed text-ink-soft">
                  A closer look at the room and the results. Click any image to
                  open it full-size.
                </p>
              </header>

              <GalleryMasonry
                items={visible}
                onOpen={openImage}
                onImageError={markFailed}
                className="mt-12 sm:mt-16"
              />
            </Container>
          </div>
        </>
      )}

      <Lightbox
        images={visible}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onIndexChange={setActiveIndex}
      />
    </>
  )
}

function GallerySkeleton() {
  return (
    <>
      <section className="texture-lines py-[var(--spacing-section)]">
        <Container className="text-center">
          <Skeleton className="mx-auto h-3 w-20" />
          <Skeleton className="mx-auto mt-4 h-9 w-80 max-w-full" />
          <Skeleton className="mx-auto mt-4 h-3 w-64 max-w-full" />
        </Container>
        <div className="mt-12 flex justify-center gap-6 overflow-hidden px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[5/6] w-[clamp(148px,20vw,244px)] shrink-0"
            />
          ))}
        </div>
      </section>

      <div className="texture-lines">
        <Container className="section-y">
          <div className="measure">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-9 w-72 max-w-full" />
          </div>
          <div className="mt-12 grid grid-cols-2 gap-2.5 sm:mt-16 sm:grid-cols-6 sm:gap-3.5 lg:grid-cols-12 lg:gap-4">
            {[
              'col-span-2 aspect-[16/10] sm:col-span-4 sm:aspect-[2/1] lg:col-span-7 lg:aspect-[7/4]',
              'col-span-2 aspect-[4/3] sm:col-span-2 sm:aspect-square lg:col-span-5 lg:aspect-[5/4]',
              'col-span-1 aspect-square sm:col-span-3 sm:aspect-[3/2] lg:col-span-4 lg:aspect-[4/5]',
              'col-span-1 aspect-square sm:col-span-3 sm:aspect-[3/2] lg:col-span-8 lg:aspect-[8/5]',
            ].map((cls, i) => (
              <Skeleton key={i} className={`${cls} w-full`} />
            ))}
          </div>
        </Container>
      </div>
    </>
  )
}
