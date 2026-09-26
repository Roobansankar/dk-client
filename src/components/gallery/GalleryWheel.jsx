import { useEffect, useMemo, useRef } from 'react'
import Container from '../layout/Container'
import GalleryTile from './GalleryTile'

/**
 * SECTION 1 — the automatic perspective image wheel.
 *
 * A flat flex row of image cells is translated left a few pixels per frame by a
 * requestAnimationFrame loop (the same technique the homepage Reviews ticker
 * uses — no carousel library). Each cell is additionally given a `rotateY` +
 * `translateZ` derived from how far its centre currently sits from the viewport
 * centre, so the row reads as images curving around a shallow cylinder rather
 * than a flat carousel. The cell list is the image set repeated then doubled;
 * the loop wraps after exactly one half-width, where the second half is a pixel
 * copy of the first, so there is no visible jump.
 *
 * Honours `prefers-reduced-motion` (renders a static arc, no loop), pauses on
 * hover / focus / touch and when the tab is hidden, and never needs interaction
 * to move. The viewport clips horizontally and the track is absolutely
 * positioned, so it cannot add page width.
 */

const SPEED_PX_PER_SEC = 26
const MAX_ROTATE_DEG = 40
const MAX_TRANSLATE_Z = 175

export default function GalleryWheel({ items, onOpen, onImageError, heading, blurb }) {
  const viewportRef = useRef(null)
  const trackRef = useRef(null)

  const cells = useMemo(() => {
    if (items.length === 0) return []
    const baseCount = Math.max(16, items.length * 2)
    const base = Array.from({ length: baseCount }, (_, i) => items[i % items.length])
    return [...base, ...base].map((item, index) => ({ item, key: `${item.id}-${index}` }))
  }, [items])
  const halfCount = cells.length / 2

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || cells.length === 0) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    let raf = 0
    let lastTs = 0
    let pos = 0
    let pitch = 0
    let cellWidth = 0
    let baseOffset = 0
    let viewportWidth = 0
    let paused = false
    let inView = true

    const measure = () => {
      const kids = track.children
      if (kids.length < 2) return
      pitch = kids[1].offsetLeft - kids[0].offsetLeft
      viewportWidth = viewport.clientWidth
      cellWidth = kids[0].offsetWidth
      const focusIndex = Math.floor(halfCount / 2)
      baseOffset = viewportWidth / 2 - (focusIndex * pitch + cellWidth / 2)
    }

    const render = () => {
      const loopWidth = halfCount * pitch
      if (loopWidth <= 0) return
      pos = ((pos % loopWidth) + loopWidth) % loopWidth
      track.style.transform = `translate3d(${(baseOffset - pos).toFixed(2)}px, -50%, 0)`

      const half = viewportWidth / 2 || 1
      const kids = track.children
      for (let i = 0; i < kids.length; i += 1) {
        const el = kids[i]
        // Cached cellWidth — never read offsetWidth here (that forces a
        // layout per child per frame and janks the whole page).
        const centre = baseOffset - pos + i * pitch + cellWidth / 2
        const n = (centre - half) / (half * 0.6)
        const clamped = Math.max(-1.8, Math.min(1.8, n))
        const rotateY = Math.max(
          -MAX_ROTATE_DEG,
          Math.min(MAX_ROTATE_DEG, -clamped * MAX_ROTATE_DEG),
        )
        const translateZ = -Math.min(Math.abs(clamped), 1.6) * MAX_TRANSLATE_Z
        const opacity = 1 - Math.min(Math.max(Math.abs(n) - 1.1, 0), 1) * 0.6
        el.style.transform = `translateZ(${translateZ.toFixed(1)}px) rotateY(${rotateY.toFixed(2)}deg)`
        el.style.opacity = opacity.toFixed(2)
      }
    }

    const step = (ts) => {
      if (!lastTs) lastTs = ts
      const dt = Math.min(ts - lastTs, 64)
      lastTs = ts
      // Offscreen / hidden / paused: skip per-child style writes entirely.
      if (!paused && !document.hidden && inView) {
        pos += (SPEED_PX_PER_SEC * dt) / 1000
        render()
      }
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

    // Pause the loop when the wheel is offscreen — free CPU/GPU for the
    // section the user is actually looking at (smooth scrolling).
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
    }, { rootMargin: '200px' })
    io.observe(viewport)

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
      io.disconnect()
      resizeObserver.disconnect()
      reduce.removeEventListener('change', onReduceChange)
      events.forEach(([type, fn]) => viewport.removeEventListener(type, fn))
    }
  }, [cells, halfCount])

  if (items.length === 0) return null

  return (
    <section className="texture-lines relative overflow-hidden py-[var(--spacing-section)]">
      <Container className="text-center">
        <p className="text-eyebrow font-medium uppercase tracking-[0.2em] text-muted">
          Gallery
        </p>
        <h1 className="mx-auto mt-4 max-w-[18ch] font-serif">{heading}</h1>
        {blurb && (
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            {blurb}
          </p>
        )}
      </Container>

      <div
        ref={viewportRef}
        aria-label="Studio gallery, automatically scrolling"
        role="group"
        className="gallery-wheel-mask relative mt-10 h-[clamp(300px,52vw,460px)] w-full overflow-hidden [perspective-origin:50%_50%] [perspective:1000px] sm:mt-14"
      >
        <div
          ref={trackRef}
          className="absolute left-0 top-1/2 flex items-center gap-5 will-change-transform [transform-style:preserve-3d] sm:gap-8"
          style={{ transform: 'translate3d(0, -50%, 0)' }}
        >
          {cells.map(({ item, key }) => (
            <div
              key={key}
              className="w-[clamp(150px,22vw,290px)] shrink-0 [backface-visibility:hidden] [transform-style:preserve-3d]"
            >
              <GalleryTile
                item={item}
                onOpen={onOpen}
                onImageError={onImageError}
                hover={false}
                radius="rounded-[3px]"
                sizes="(max-width: 640px) 46vw, 290px"
                className="aspect-[4/5]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
