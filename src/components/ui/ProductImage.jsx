import { useState } from 'react'
import clsx from 'clsx'

/**
 * One reusable product image slot.
 *
 * When the catalogue supplies a real image URL it is shown, object-covered into
 * a fixed aspect ratio so the grid never shifts as photos load. When there is
 * no image — or the supplied one fails to load — a quiet DK StyleHub placeholder
 * is drawn instead: a neutral editorial panel with a hairline border and the
 * wordmark, using the existing theme tokens so it adapts to light / dark on its
 * own. It is deliberately understated — a considered blank, not a broken image.
 *
 * @param {object} props
 * @param {string|null} [props.src]      real product image URL, if any
 * @param {string} [props.alt]           accessible description (photo only)
 * @param {string} [props.ratio]         aspect-ratio utility, default 'aspect-[4/5]'
 * @param {string} [props.className]     classes for the outer frame
 * @param {string} [props.imgClassName]  extra classes for the <img> (e.g. a hover zoom)
 */
export default function ProductImage({
  src,
  alt = '',
  ratio = 'aspect-[4/5]',
  className,
  imgClassName,
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(src) && !failed

  return (
    <div
      className={clsx(
        'relative overflow-hidden border border-line bg-surface-sunken',
        ratio,
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={clsx('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
        >
          <span className="font-serif text-2xl leading-none text-ink-soft">DK</span>
          <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-muted">
            StyleHub
          </span>
        </div>
      )}
    </div>
  )
}
