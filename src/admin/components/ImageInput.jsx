import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button, cn } from './ui'
import { resolveMediaUrl } from '../../lib/env'

const MAX_KB = Number(import.meta.env.VITE_MEDIA_MAX_KB || 4096)
const ACCEPT = 'image/jpeg,image/png,image/webp'

/**
 * Single-image picker with local preview. Emits { file, remove } via onChange:
 *  - file  : a File to upload (or null)
 *  - remove: true when an existing image should be cleared
 */
export function ImageInput({ currentUrl, onChange, error, label = 'Image', hint }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [removed, setRemoved] = useState(false)
  const [localError, setLocalError] = useState(null)

  const shownUrl = removed ? null : preview || resolveMediaUrl(currentUrl)

  function pick(file) {
    setLocalError(null)
    if (!file) return
    if (!ACCEPT.split(',').includes(file.type)) {
      setLocalError('Use a JPG, PNG or WebP image.')
      return
    }
    if (file.size / 1024 > MAX_KB) {
      setLocalError(`Image must be under ${Math.round(MAX_KB / 1024)} MB.`)
      return
    }
    setRemoved(false)
    setPreview(URL.createObjectURL(file))
    onChange({ file, remove: false })
  }

  function clear() {
    setPreview(null)
    setRemoved(true)
    if (inputRef.current) inputRef.current.value = ''
    onChange({ file: null, remove: true })
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)]',
            (error || localError) && 'border-[var(--color-danger)]',
          )}
        >
          {shownUrl ? (
            <img src={shownUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={20} className="text-[var(--color-faint)]" />
          )}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {shownUrl ? 'Replace' : 'Upload'}
            </Button>
            {shownUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                <Trash2 size={14} /> Remove
              </Button>
            )}
          </div>
          {localError || error ? (
            <p className="text-xs text-[var(--color-danger)]">{localError || error}</p>
          ) : (
            <p className="text-xs text-[var(--color-faint)]">
              {hint || `JPG, PNG or WebP · up to ${Math.round(MAX_KB / 1024)} MB`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
