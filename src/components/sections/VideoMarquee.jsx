import { useEffect, useMemo, useRef } from 'react'
import Container from '../layout/Container'
import { useHomepageVideos } from '../../context/VideoContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Video" section — three rows of Instagram-format (4:5) video
 * cards, alternating scroll direction (row 1 left→right, row 2 right→left,
 * row 3 left→right), placed just above Booking. Cards never autoplay — each
 * shows its poster at rest and only plays via the visitor's own click on
 * the native controls. Built entirely from
 * `GET /api/videos` — no hardcoded/fake videos; if fewer clips exist than a
 * row needs to feel full, the available set is repeated (never duplicated
 * in the database, just re-rendered) to fill it, exactly like the /gallery
 * page's GalleryWheel repeats its image set.
 *
 * Movement reuses GalleryWheel's proven technique (see
 * components/gallery/GalleryWheel.jsx) rather than a new animation system:
 * a plain rAF loop translates a flex row a few px/frame, the row's item
 * list is doubled so the loop wraps after exactly one half-width with a
 * pixel-identical second half (no visible jump), and it pauses on hover/
 * focus/touch and respects `prefers-reduced-motion`. Deliberately NOT
 * reused verbatim as a shared component — GalleryWheel is coupled to the
 * lightbox/3D-wheel treatment that belongs only to the Gallery page; this
 * is the same core loop, flattened (no rotateY/translateZ) and
 * direction-aware for three independent rows instead of one.
 */

const SPEED_PX_PER_SEC = 34

function useMarqueeRow(direction) {
  const viewportRef = useRef(null)
  const trackRef = useRef(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    // translate3d(-pos, …): increasing `pos` shifts the track left (content
    // flows right→left, GalleryWheel's default); negating it flips to left→right.
    const sign = direction === 'ltr' ? -1 : 1

    let raf = 0
    let lastTs = 0
    let pos = 0
    let pitch = 0
    let paused = false

    const measure = () => {
      const kids = track.children
      if (kids.length < 2) return
      pitch = kids[1].offsetLeft - kids[0].offsetLeft
    }

    const halfCount = () => track.children.length / 2

    const render = () => {
      const loopWidth = halfCount() * pitch
      if (loopWidth <= 0) return
      pos = ((pos % loopWidth) + loopWidth) % loopWidth
      track.style.transform = `translate3d(${(-pos).toFixed(2)}px, 0, 0)`
    }

    const step = (ts) => {
      if (!lastTs) lastTs = ts
      const dt = Math.min(ts - lastTs, 64)
      lastTs = ts
      if (!paused && !document.hidden) {
        pos += sign * ((SPEED_PX_PER_SEC * dt) / 1000)
      }
      render()
      raf = requestAnimationFrame(step)
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const start = () => {
      if (raf) return
      lastTs = 0
      measure()
      render()
      if (!reduce.matches) raf = requestAnimationFrame(step)
    }

    start()

    const resizeObserver = new ResizeObserver(() => {
      measure()
      render()
    })
    resizeObserver.observe(viewport)

    const onReduceChange = () => {
      stop()
      start()
    }
    reduce.addEventListener('change', onReduceChange)

    const pause = () => {
      paused = true
    }
    const resume = () => {
      paused = false
    }
    const events = [
      ['pointerenter', pause],
      ['pointerleave', resume],
      ['pointerdown', pause],
      ['pointerup', resume],
      ['pointercancel', resume],
      ['focusin', pause],
      ['focusout', resume],
    ]
    events.forEach(([type, fn]) => viewport.addEventListener(type, fn))

    return () => {
      stop()
      resizeObserver.disconnect()
      reduce.removeEventListener('change', onReduceChange)
      events.forEach(([type, fn]) => viewport.removeEventListener(type, fn))
    }
  }, [direction])

  return { viewportRef, trackRef }
}

/** One row: `items` repeated to a sensible minimum, then doubled for the seamless loop. */
function MarqueeRow({ items, direction, rowIndex }) {
  const { viewportRef, trackRef } = useMarqueeRow(direction)

  const cells = useMemo(() => {
    const minCount = Math.max(10, items.length * 3)
    const base = Array.from({ length: minCount }, (_, i) => items[i % items.length])
    return [...base, ...base].map((item, index) => ({ item, key: `${rowIndex}-${item.id}-${index}` }))
  }, [items, rowIndex])

  return (
    <div
      ref={viewportRef}
      aria-hidden={rowIndex !== 0}
      className="relative w-full overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex w-max items-stretch gap-4 will-change-transform sm:gap-5"
      >
        {cells.map(({ item, key }) => (
          <div
            key={key}
            className="aspect-[4/5] w-[clamp(150px,24vw,240px)] shrink-0 overflow-hidden rounded-2xl border border-line bg-scrim sm:w-[clamp(200px,20vw,280px)]"
          >
            {/* No autoplay — the poster is the resting state; native controls
                let the visitor start playback themselves. */}
            <video
              src={item.src}
              poster={item.poster || undefined}
              className="h-full w-full object-cover"
              controls
              loop
              playsInline
              preload="metadata"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Row 1 left→right, row 2 right→left, row 3 left→right.
const ROW_DIRECTIONS = ['ltr', 'rtl', 'ltr']

export default function VideoMarquee() {
  const { items, loading, error } = useHomepageVideos()

  if (!loading && items.length === 0 && !error) return null

  return (
    <section className="relative overflow-hidden border-t border-line bg-paper py-[var(--spacing-section)]">
      <Container className="text-center">
        <p className="eyebrow">In motion</p>
        <h2 className="mt-4 font-serif text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] text-ink">
          Life at the studio.
        </h2>
      </Container>

      {loading ? (
        <div className="mt-10 flex flex-col gap-4 sm:mt-14 sm:gap-5">
          {ROW_DIRECTIONS.map((_, i) => (
            <div key={i} className="container-page flex gap-4 sm:gap-5">
              {Array.from({ length: 5 }).map((__, j) => (
                <Skeleton
                  key={j}
                  className="aspect-[4/5] w-[clamp(150px,24vw,240px)] shrink-0 rounded-2xl sm:w-[clamp(200px,20vw,280px)]"
                />
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <Container>
          <p className="mt-10 text-center text-ink-soft sm:mt-14">
            We couldn’t load the studio videos just now.
          </p>
        </Container>
      ) : (
        <div className="mt-10 flex flex-col gap-4 sm:mt-14 sm:gap-5">
          {ROW_DIRECTIONS.map((direction, i) => (
            <MarqueeRow key={i} items={items} direction={direction} rowIndex={i} />
          ))}
        </div>
      )}
    </section>
  )
}
