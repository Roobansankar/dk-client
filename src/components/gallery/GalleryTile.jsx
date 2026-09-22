import { Expand } from 'lucide-react'
import clsx from 'clsx'

/**
 * One gallery image, shared by both sections. Opens the lightbox on a single
 * click (Enter / Space via the native button for keyboard users). A broken
 * image removes itself via `onImageError` so the parent can drop it.
 *
 * With `hover` (the default, used by the masonry) it gets a restrained editorial
 * hover — a subtle 3D card flip that turns the tile to a dimmed copy of the same
 * image with a small "open" affordance. It's a slow, single half-turn (no
 * bounce, no continuous spin), stays inside the tile's own box so layout,
 * sizing and the masonry composition are untouched, and collapses to a plain
 * static image (with the original corner affordance on hover) under
 * `prefers-reduced-motion`. The wheel passes `hover={false}` for a completely
 * static tile: no flip, overlay, affordance or transition of any kind.
 *
 * @param {{
 *   item: { id: string, src: string, alt?: string },
 *   onOpen: (item: object) => void,
 *   onImageError?: (id: string) => void,
 *   className?: string,
 *   tone?: 'light' | 'dark',
 *   radius?: string,
 *   priority?: boolean,
 *   sizes?: string,
 *   hover?: boolean,
 * }} props
 */
export default function GalleryTile({
  item,
  onOpen,
  onImageError,
  className,
  tone = 'light',
  radius = 'rounded-[10px] sm:rounded-xl',
  priority = false,
  sizes,
  hover = true,
}) {
  const imgProps = {
    src: item.src,
    alt: item.alt || '',
    draggable: false,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    sizes,
    onError: () => onImageError?.(item.id),
  }

  return (
    <figure
      className={clsx(
        'group relative m-0 overflow-hidden',
        radius,
        tone === 'dark' ? 'bg-white/[0.04]' : 'bg-surface-sunken',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={item.alt ? `Open image: ${item.alt}` : 'Open image'}
        className={clsx(
          'block h-full w-full cursor-zoom-in select-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current',
          hover && 'perspective-[1200px]',
        )}
      >
        {hover ? (
          <>
            <div
              className={clsx(
                'relative h-full w-full transform-3d will-change-transform',
                'rotate-y-0 transition-transform duration-[650ms] ease-[var(--ease-standard)]',
                'group-hover:rotate-y-180',
                'motion-reduce:transition-none motion-reduce:group-hover:rotate-y-0',
              )}
            >
              {/* Front — the image itself. */}
              <img
                {...imgProps}
                className="absolute inset-0 h-full w-full object-cover backface-hidden"
              />

              {/* Back — a dimmed copy of the same image + a small open cue. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 overflow-hidden rotate-y-180 backface-hidden"
              >
                <img
                  src={item.src}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <span
                  className={clsx(
                    'absolute inset-0 grid place-items-center',
                    tone === 'dark' ? 'bg-black/50' : 'bg-black/40',
                  )}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-sm">
                    <Expand size={14} aria-hidden="true" />
                  </span>
                </span>
              </div>
            </div>

            {/* Reduced motion: no flip happens, so keep the original restrained
                corner affordance that fades in on hover. */}
            <span
              aria-hidden="true"
              className={clsx(
                'pointer-events-none absolute bottom-2 right-2 hidden h-7 w-7 place-items-center rounded-full border opacity-0 backdrop-blur-sm transition-opacity duration-300 ease-[var(--ease-standard)] group-hover:opacity-100 motion-reduce:grid',
                tone === 'dark'
                  ? 'border-white/25 bg-black/30 text-white'
                  : 'border-white/40 bg-black/20 text-white',
              )}
            >
              <Expand size={12} aria-hidden="true" />
            </span>
          </>
        ) : (
          <img {...imgProps} className="h-full w-full object-cover" />
        )}
      </button>
    </figure>
  )
}
