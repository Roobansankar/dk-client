import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import ProductImage from './ProductImage'

/**
 * The photos of a product or a combo on its detail page: one large image with
 * a row of thumbnails underneath (up to four). With a single photo it is just
 * the image, exactly as before.
 *
 * Moving between photos: click a thumbnail, use the arrows on the image,
 * swipe it on a touch screen, or press ←/→ while a thumbnail has focus.
 *
 * @param {object} props
 * @param {string[]} [props.images]  photo URLs in display order (first = cover)
 * @param {string} [props.alt]       what the photos show (the product name)
 * @param {string} [props.ratio]     aspect-ratio utility for the large image
 */

const HOVER_ZOOM =
  'transition-transform duration-[600ms] ease-[var(--ease-standard)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100'

const SWIPE_PX = 50

function Thumb({ src }) {
  const [failed, setFailed] = useState(false)

  return failed ? (
    <span className="block h-full w-full bg-surface-sunken" aria-hidden="true" />
  ) : (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  )
}

export default function ImageGallery({ images = [], alt = '', ratio = 'aspect-[4/5]' }) {
  const photos = images.filter(Boolean)
  const [selected, setSelected] = useState(0)
  const thumbs = useRef([])
  const swipeFrom = useRef(null)

  const count = photos.length
  const many = count > 1
  const index = Math.min(selected, Math.max(count - 1, 0))

  const show = (next) => setSelected(((next % count) + count) % count)

  // arrows move from the thumbnail that has focus, which need not be the selected one
  const onThumbKey = (event, from) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    const next = (from + (event.key === 'ArrowRight' ? 1 : -1) + count) % count

    event.preventDefault()
    show(next)
    thumbs.current[next]?.focus()
  }

  const arrow =
    'absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink'

  return (
    <div>
      <figure
        className="group relative touch-pan-y overflow-hidden"
        onPointerDown={(event) => {
          swipeFrom.current = event.pointerType === 'mouse' ? null : event.clientX
        }}
        onPointerUp={(event) => {
          if (swipeFrom.current == null || !many) return

          const delta = event.clientX - swipeFrom.current
          swipeFrom.current = null

          if (Math.abs(delta) >= SWIPE_PX) show(index + (delta < 0 ? 1 : -1))
        }}
      >
        {/* keyed by photo so a failed image never leaves the next one showing the placeholder */}
        <ProductImage
          key={photos[index] ?? 'none'}
          src={photos[index]}
          alt={many ? `${alt} — photo ${index + 1} of ${count}` : alt}
          ratio={ratio}
          className="rounded-[var(--radius-md)]"
          imgClassName={HOVER_ZOOM}
        />

        {many && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => show(index - 1)} className={clsx(arrow, 'left-3')}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => show(index + 1)} className={clsx(arrow, 'right-3')}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <span
              aria-hidden="true"
              className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.65rem] font-medium tabular-nums tracking-wide text-paper"
            >
              {index + 1} / {count}
            </span>
          </>
        )}
      </figure>

      {many && (
        <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Photos">
          {photos.map((src, i) => (
            <li key={src} className="aspect-square">
              <button
                ref={(node) => {
                  thumbs.current[i] = node
                }}
                type="button"
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => show(i)}
                onKeyDown={(event) => onThumbKey(event, i)}
                className={clsx(
                  'h-full w-full overflow-hidden rounded-[var(--radius-sm,0.375rem)] border bg-surface-sunken transition-[opacity,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                  i === index
                    ? 'border-ink ring-1 ring-ink'
                    : 'border-line opacity-70 hover:border-line-strong hover:opacity-100',
                )}
              >
                <Thumb src={src} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
