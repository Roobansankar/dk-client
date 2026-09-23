import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import Container from '../layout/Container'
import { useHomepageVideos } from '../../context/VideoContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Video" section — up to 10 clips in two marquee rows of 5
 * (row 1: videos 1–5 scrolling left→right, row 2: videos 6–10 scrolling
 * right→left), placed just above Booking. Built entirely from
 * `GET /api/videos` — no hardcoded/fake videos. When fewer clips exist the
 * layout adjusts: 1–5 clips render a single row, 6–9 fill the second row
 * with what exists; a row shorter than a full viewport repeats its own set
 * (never duplicated in the database, just re-rendered) to fill the loop,
 * exactly like the /gallery page's GalleryWheel repeats its image set.
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
 * direction-aware for two independent rows instead of one.
 *
 * Cards never autoplay — each shows its poster at rest with a play affordance.
 * Clicking (or Enter/Space on) a card opens the player overlay, which
 * autoplays that clip with native controls; arrows step through the shown
 * set. Closing unmounts the player, so playback always stops.
 */

/** Homepage never shows more than this many clips: two rows of five. */
const MAX_VIDEOS = 10
const PER_ROW = 5

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

/**
 * One row: its own slice of the shown set, repeated to a sensible minimum,
 * then doubled for the seamless loop. The doubled second half is hidden
 * from assistive tech / tab order — it is a pixel-identical loop filler.
 */
function MarqueeRow({ items, direction, rowIndex, onPlay }) {
  const { viewportRef, trackRef } = useMarqueeRow(direction)

  const cells = useMemo(() => {
    const minCount = Math.max(10, items.length * 3)
    const base = Array.from({ length: minCount }, (_, i) => items[i % items.length])
    return [...base, ...base].map((item, index) => ({
      item,
      key: `${rowIndex}-${item.id}-${index}`,
      // Second (loop-filler) half: presentational duplicate.
      duplicate: index >= base.length,
    }))
  }, [items, rowIndex])

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden">
      <div
        ref={trackRef}
        className="flex w-max items-stretch gap-4 will-change-transform sm:gap-5"
      >
        {cells.map(({ item, key, duplicate }) => (
          <div
            key={key}
            aria-hidden={duplicate || undefined}
            className="aspect-[4/5] w-[clamp(150px,24vw,240px)] shrink-0 overflow-hidden rounded-2xl border border-line bg-scrim sm:w-[clamp(200px,20vw,280px)]"
          >
            {/* Poster-only preview — playback happens in the player overlay,
                so the scrolling row stays light (metadata preload only). */}
            <button
              type="button"
              onClick={() => onPlay(item)}
              tabIndex={duplicate ? -1 : undefined}
              aria-label={item.title ? `Play video: ${item.title}` : 'Play studio video'}
              className="group relative block h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <video
                src={item.src}
                poster={item.poster || undefined}
                className="h-full w-full object-cover"
                playsInline
                preload="metadata"
                muted
                tabIndex={-1}
                aria-hidden="true"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center bg-scrim/0 transition-colors duration-300 group-hover:bg-scrim/25"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-transform duration-300 group-hover:scale-110">
                  <Play size={20} className="ml-0.5 fill-current" />
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Player overlay — mirrors components/gallery/Lightbox.jsx behaviour:
 * portal on body, Escape/backdrop/close-button closes, ← / → step through
 * the shown clips, background scroll locked while open, focus moved in and
 * restored on close. Unmounting the <video> on close (or on step) always
 * stops playback — nothing keeps playing behind the page.
 */
function VideoPlayer({ videos, index, onClose, onIndexChange }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const open = index != null && videos[index] != null
  const video = open ? videos[index] : null
  const atStart = index === 0
  const atEnd = index === videos.length - 1

  const goPrev = useCallback(() => {
    if (index != null && index > 0) onIndexChange(index - 1)
  }, [index, onIndexChange])

  const goNext = useCallback(() => {
    if (index != null && index < videos.length - 1) onIndexChange(index + 1)
  }, [index, videos.length, onIndexChange])

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'ArrowLeft':
          event.preventDefault()
          goPrev()
          break
        case 'ArrowRight':
          event.preventDefault()
          goNext()
          break
        case 'Tab': {
          const focusables = dialogRef.current?.querySelectorAll('button:not([disabled])')
          if (!focusables?.length) {
            event.preventDefault()
            break
          }
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
          break
        }
        default:
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose, goPrev, goNext])

  if (!open) return null

  const navButton =
    'absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full ' +
    'bg-white/90 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-transform duration-200 hover:scale-105 ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-white disabled:pointer-events-none disabled:opacity-25 ' +
    'sm:h-14 sm:w-14'

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={video.title ? `Playing video: ${video.title}` : 'Playing studio video'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim/95 px-12 py-12 sm:px-20 sm:py-16"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          goPrev()
        }}
        disabled={atStart}
        aria-label="Previous video"
        className={`${navButton} left-1 sm:left-4`}
      >
        <ChevronLeft size={26} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          goNext()
        }}
        disabled={atEnd}
        aria-label="Next video"
        className={`${navButton} right-1 sm:right-4`}
      >
        <ChevronRight size={26} aria-hidden="true" />
      </button>

      <figure
        onClick={(event) => event.stopPropagation()}
        className="m-0 flex max-h-full w-full max-w-4xl flex-col items-center"
      >
        <video
          key={video.src}
          src={video.src}
          poster={video.poster || undefined}
          className="max-h-[78svh] w-auto max-w-full rounded-2xl bg-black object-contain shadow-[0_32px_80px_rgb(0_0_0/0.5)]"
          controls
          autoPlay
          loop
          playsInline
          preload="auto"
        />
        {video.title && (
          <figcaption className="mt-3 max-w-prose text-center text-sm font-medium text-white">
            {video.title}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )
}

// Row 1 left→right, row 2 right→left.
const ROW_DIRECTIONS = ['ltr', 'rtl']

export default function VideoMarquee() {
  const { items, loading, error } = useHomepageVideos()
  const [playerIndex, setPlayerIndex] = useState(null)

  // The homepage set: first 10 active clips in admin order, split into
  // rows of 5. Fewer than 5 → one row; 6–9 → a shorter second row.
  const shown = useMemo(() => items.slice(0, MAX_VIDEOS), [items])
  const rows = useMemo(() => {
    const out = []
    for (let i = 0; i < shown.length; i += PER_ROW) out.push(shown.slice(i, i + PER_ROW))
    return out
  }, [shown])

  const openPlayer = useCallback(
    (item) => {
      const at = shown.findIndex((v) => v.id === item.id)
      if (at >= 0) setPlayerIndex(at)
    },
    [shown],
  )

  if (!loading && shown.length === 0 && !error) return null

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
              {Array.from({ length: PER_ROW }).map((__, j) => (
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
          {rows.map((rowItems, i) => (
            <MarqueeRow
              key={i}
              items={rowItems}
              direction={ROW_DIRECTIONS[i % ROW_DIRECTIONS.length]}
              rowIndex={i}
              onPlay={openPlayer}
            />
          ))}
        </div>
      )}

      <VideoPlayer
        videos={shown}
        index={playerIndex}
        onClose={() => setPlayerIndex(null)}
        onIndexChange={setPlayerIndex}
      />
    </section>
  )
}
