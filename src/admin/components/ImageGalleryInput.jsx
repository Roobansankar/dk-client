import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react'
import { cn } from './ui'
import { MAX_IMAGES } from '../lib/gallery'

/**
 * Up to four photos for a product or a combo, managed in one place: add several
 * at once, take one away, move one earlier or later. The FIRST photo is the
 * cover — the one shown on cards — and the order here is the order the shop's
 * detail page shows them.
 *
 * The parent keeps the list (`items`) and passes it back through `onChange` — see
 * ../lib/gallery.js for its shape and for turning it into the fields the API expects.
 */

const MAX_KB = Number(import.meta.env.VITE_MEDIA_MAX_KB || 4096)
const ACCEPT = 'image/jpeg,image/png,image/webp'

let nextKey = 0

export function ImageGalleryInput({ items, onChange, error, label = 'Photos', hint }) {
  const inputRef = useRef(null)
  const [localError, setLocalError] = useState(null)

  // Free the local previews when the form closes.
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  useEffect(
    () => () => latest.current.forEach((item) => item.kind === 'new' && URL.revokeObjectURL(item.url)),
    [],
  )

  const full = items.length >= MAX_IMAGES

  function add(fileList) {
    setLocalError(null)

    const room = MAX_IMAGES - items.length
    const added = []
    let problem = null

    for (const file of Array.from(fileList ?? [])) {
      if (added.length >= room) {
        problem = `Only ${MAX_IMAGES} photos fit — the extra ones were left out.`
        break
      }
      if (!ACCEPT.split(',').includes(file.type)) {
        problem = 'Use JPG, PNG or WebP images.'
        continue
      }
      if (file.size / 1024 > MAX_KB) {
        problem = `Each photo must be under ${Math.round(MAX_KB / 1024)} MB.`
        continue
      }
      added.push({ key: `n${++nextKey}`, kind: 'new', file, url: URL.createObjectURL(file) })
    }

    if (problem) setLocalError(problem)
    if (added.length) onChange([...items, ...added])
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(index) {
    const item = items[index]
    if (item.kind === 'new') URL.revokeObjectURL(item.url)
    setLocalError(null)
    onChange(items.filter((_, i) => i !== index))
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const iconButton =
    'flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] text-[var(--color-ink)] shadow-sm transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="label !mb-0">{label}</span>
        <span className="text-xs tabular-nums text-[var(--color-faint)]" aria-live="polite">
          {items.length} of {MAX_IMAGES}
        </span>
      </div>

      <ul className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: MAX_IMAGES }, (_, slot) => {
          const item = items[slot]

          if (item) {
            return (
              <li
                key={item.key}
                className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)]"
              >
                <img src={item.url} alt={`Photo ${slot + 1}`} className="h-full w-full object-cover" />

                {slot === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-[var(--color-ink)] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-paper)]">
                    Cover
                  </span>
                )}

                <button
                  type="button"
                  aria-label={`Remove photo ${slot + 1}`}
                  title="Remove"
                  onClick={() => remove(slot)}
                  className={cn(iconButton, 'absolute right-1 top-1')}
                >
                  <X size={13} aria-hidden="true" />
                </button>

                <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label={`Move photo ${slot + 1} earlier`}
                    title="Move earlier"
                    disabled={slot === 0}
                    onClick={() => move(slot, -1)}
                    className={iconButton}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${slot + 1} later`}
                    title="Move later"
                    disabled={slot === items.length - 1}
                    onClick={() => move(slot, 1)}
                    className={iconButton}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          }

          // the next free slot is the "add" button; the rest are quiet placeholders
          return slot === items.length ? (
            <li key={`add-${slot}`}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed bg-[var(--color-surface-sunken)] text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]',
                  error || localError ? 'border-[var(--color-danger)]' : 'border-[var(--color-line-strong)]',
                )}
              >
                <ImagePlus size={18} aria-hidden="true" />
                Add photo
              </button>
            </li>
          ) : (
            <li
              key={`empty-${slot}`}
              aria-hidden="true"
              className="aspect-square rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] opacity-50"
            />
          )
        })}
      </ul>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        aria-label="Choose photos"
        disabled={full}
        onChange={(e) => add(e.target.files)}
      />

      {localError || error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">
          {localError || error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-faint)]">
          {hint || `Up to ${MAX_IMAGES} photos (JPG, PNG or WebP, ${Math.round(MAX_KB / 1024)} MB each). The first one is the cover shown on cards.`}
        </p>
      )}
    </div>
  )
}
