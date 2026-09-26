import { useEffect, useMemo, useRef } from 'react'
import Container from '../layout/Container'
import { useReviewsContext } from '../../context/ReviewsContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Reviews": a dark editorial band whose cards drift continuously to
 * the left, like a slow ticker. Implementation is a plain overflow scroller
 * (so touch swipe / drag / wheel / keyboard all keep working) that a
 * requestAnimationFrame loop nudges by a few pixels each frame; the card set is
 * doubled so the loop wraps seamlessly. It pauses on hover, focus and pointer
 * interaction, and honours `prefers-reduced-motion` (then it is simply a manual
 * scroller). No carousel library, no dots, no autoplay controls.
 *
 * Cards come entirely from `GET /api/reviews` — Google reviews staff manually
 * enter and publish in Admin (see admin/pages/Reviews.jsx). There is no
 * scraping/automatic sync with Google, and no sample/placeholder reviews are
 * ever substituted: while loading the band shows card-shaped skeletons; if
 * nothing is published yet (or the request fails) it shows a quiet message
 * instead of the ticker. Real reviews are repeated only to fill the loop
 * visually — never invented — and the repeats are `aria-hidden` so assistive
 * tech reads each review once.
 */

const MIN_VISIBLE = 6
const DRIFT_PX_PER_SEC = 24

/** Repeat `items` until there are at least `min`, without ever inventing content. */
function repeatToAtLeast(items, min) {
  if (items.length === 0) return items
  const out = []
  while (out.length < min) out.push(...items)
  return out
}

function Stars({ rating }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="text-[0.7rem] tracking-[0.3em] text-accent"
      >
        {'★'.repeat(rating)}
        <span className="text-white/20">{'★'.repeat(5 - rating)}</span>
      </span>
      <span className="sr-only">Rated {rating} out of 5</span>
    </>
  )
}

export default function CustomerReviews() {
  const { items, loading, error } = useReviewsContext()
  const six = useMemo(() => repeatToAtLeast(items, MIN_VISIBLE), [items])
  const track = useMemo(() => [...six, ...six], [six])

  const scrollerRef = useRef(null)
  const pausedRef = useRef(false)
  const posRef = useRef(0)
  const resumeTimer = useRef(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let last = 0
    let loopDistance = 0
    let inView = true
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
    }, { rootMargin: '200px' })
    io.observe(el)

    const measure = () => {
      const kids = el.children
      loopDistance =
        kids.length > six.length
          ? kids[six.length].offsetLeft - kids[0].offsetLeft
          : el.scrollWidth / 2
    }

    const step = (now) => {
      if (!last) last = now
      const dt = Math.min(now - last, 64)
      last = now
      if (!pausedRef.current && !document.hidden && inView && loopDistance > 0) {
        posRef.current += (DRIFT_PX_PER_SEC * dt) / 1000
        if (posRef.current >= loopDistance) posRef.current -= loopDistance
        el.scrollLeft = posRef.current
      } else {
        // manual scroll (or paused) — keep our accumulator in sync
        posRef.current = el.scrollLeft % (loopDistance || 1)
      }
      raf = requestAnimationFrame(step)
    }

    const start = () => {
      if (raf || reduce.matches) return
      last = 0
      measure()
      raf = requestAnimationFrame(step)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    start()
    reduce.addEventListener('change', () => (reduce.matches ? stop() : start()))

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      clearTimeout(resumeTimer.current)
    }
    // Re-measure if the underlying card count changes (e.g. the placeholder
    // set is swapped for real published reviews shortly after mount).
  }, [six.length])

  const pause = () => {
    clearTimeout(resumeTimer.current)
    pausedRef.current = true
  }
  const resume = () => {
    clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false
    }, 700)
  }

  return (
    <section
      id="reviews"
      className="scroll-mt-20 overflow-hidden border-t border-line bg-scrim text-white"
    >
      <Container className="section-y">
        <header className="max-w-xl">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-white/50">
            Reviews
          </p>
          <h2 className="mt-4 font-serif text-white">What clients say</h2>
        </header>

        {loading ? (
          <ul aria-hidden="true" className="mt-12 flex gap-5 overflow-hidden sm:mt-16">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex shrink-0 grow-0 basis-[80%] flex-col items-center border border-white/12 bg-white/[0.03] p-7 sm:basis-[32%] sm:p-8"
              >
                <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
                <Skeleton className="mt-5 h-3 w-24 bg-white/10" />
                <Skeleton className="mt-5 h-16 w-full bg-white/10" />
                <Skeleton className="mt-6 h-3 w-32 bg-white/10" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="mt-12 text-white/60 sm:mt-16">
            {error
              ? 'We couldn’t load reviews just now. Please check back shortly.'
              : 'No reviews published yet — check back soon.'}
          </p>
        ) : (
          <div
            ref={scrollerRef}
            role="region"
            aria-label="Customer reviews"
            tabIndex={0}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            onPointerDown={pause}
            onPointerUp={resume}
            onPointerCancel={resume}
            className="no-scrollbar contain-content mt-12 flex gap-5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50 sm:mt-16"
          >
            {track.map((review, index) => (
              <figure
                key={index}
                aria-hidden={index >= six.length ? 'true' : undefined}
                className="flex shrink-0 grow-0 basis-[80%] flex-col items-center border border-white/12 bg-white/[0.03] p-7 text-center sm:basis-[32%] sm:p-8"
              >
                {review.avatarUrl ? (
                  <img
                    src={review.avatarUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid h-14 w-14 place-items-center rounded-full border border-white/20 font-serif text-3xl leading-none text-white/35"
                  >
                    &ldquo;
                  </span>
                )}

                <span className="mt-5 block">
                  <Stars rating={review.rating} />
                </span>

                <blockquote className="mt-5 font-serif text-lg leading-relaxed text-white/85">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>

                <figcaption className="mt-6 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-white/50">
                  {review.name}
                  {review.context ? <> &middot; {review.context}</> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
