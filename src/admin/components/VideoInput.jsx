import { useRef, useState } from 'react'
import { Trash2, Video as VideoIcon } from 'lucide-react'
import { Button, cn } from './ui'
import { resolveMediaUrl } from '../../lib/env'

// No size cap, by design — matches config('salon.video_uploads') on the
// backend, which only validates format; App\Support\VideoUploader compresses
// whatever comes through regardless of original size.
const ACCEPT = '.mp4,.mov,.webm,.mkv,.avi,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo'

/**
 * Single-video picker with local preview — mirrors ImageInput's shape, just
 * a <video> instead of an <img> and no client-side size check (video has no
 * app-level size cap; see ACCEPT's docblock). Emits { file, remove }.
 */
export function VideoInput({ currentUrl, posterUrl, onChange, error, label = 'Video', hint }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [removed, setRemoved] = useState(false)

  const shownUrl = removed ? null : preview || resolveMediaUrl(currentUrl)

  function pick(file) {
    if (!file) return
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
            error && 'border-[var(--color-danger)]',
          )}
        >
          {shownUrl ? (
            <video
              src={shownUrl}
              poster={!preview ? resolveMediaUrl(posterUrl) : undefined}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <VideoIcon size={20} className="text-[var(--color-faint)]" />
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
          {error ? (
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          ) : (
            <p className="text-xs text-[var(--color-faint)]">
              {hint || 'MP4, MOV, WebM, MKV or AVI · compressed automatically'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
