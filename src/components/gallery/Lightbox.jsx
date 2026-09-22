import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Full-image overlay for the Gallery. Rendered through a portal on `document.body`
 * so it escapes Section 1's `overflow: hidden` / 3D transform context.
 *
 * The backdrop is a single solid theme colour — pure white in light mode, pure
 * black in dark — covering the whole viewport uniformly (no tint, gradient,
 * transparency or blur).
 *
 * Behaviour: Escape closes; clicking the backdrop or the close button closes;
 * the edge arrows and ← / → step through `images` without wrapping (each arrow
 * disables at its end). Background scroll is locked while open and restored on
 * unmount; focus moves into the dialog and returns to the trigger afterwards.
 * It is a single overlay — no separate route.
 *
 * @param {{
 *   images: { src: string, alt?: string }[],
 *   index: number | null,
 *   onClose: () => void,
 *   onIndexChange: (next: number) => void,
 * }} props
 */
export default function Lightbox({ images, index, onClose, onIndexChange }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const open = index != null && images[index] != null
  const image = open ? images[index] : null
  const atStart = index === 0
  const atEnd = index === images.length - 1

  const goPrev = useCallback(() => {
    if (index != null && index > 0) onIndexChange(index - 1)
  }, [index, onIndexChange])

  const goNext = useCallback(() => {
    if (index != null && index < images.length - 1) onIndexChange(index + 1)
  }, [index, images.length, onIndexChange])

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
          // Keep focus within the dialog, cycling the enabled controls.
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
    'text-ink transition-[background-color,opacity] duration-200 hover:bg-ink/[0.06] ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-25 ' +
    'sm:h-14 sm:w-14'

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt ? `Enlarged image: ${image.alt}` : 'Enlarged gallery image'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white px-12 py-12 dark:bg-black sm:px-20 sm:py-16"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:right-5 sm:top-5"
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
        aria-label="Previous image"
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
        aria-label="Next image"
        className={`${navButton} right-1 sm:right-4`}
      >
        <ChevronRight size={26} aria-hidden="true" />
      </button>

      <figure
        onClick={(event) => event.stopPropagation()}
        className="m-0 flex max-h-full max-w-5xl flex-col items-center"
      >
        <img
          key={image.src}
          src={image.src}
          alt={image.alt || ''}
          className="max-h-[82svh] w-auto max-w-full object-contain"
        />
        {image.alt && (
          <figcaption className="mt-3 max-w-prose text-center text-xs leading-relaxed text-ink-soft">
            {image.alt}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )
}
