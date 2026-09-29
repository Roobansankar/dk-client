import { useRef, useState } from 'react'
import { Trash2, Video as VideoIcon } from 'lucide-react'
import { Button, cn } from './ui'
import { resolveMediaUrl } from '../../lib/env'

// Application-level ceiling, mirroring the backend's
// config('salon.video_uploads.max_kb') (default 25600 KB = 25 MB — see
// Store/UpdateVideoRequest). Checked here first so an oversized file gets
// an instant message without uploading anything; the server re-validates
// and its message (shown via `error`) is the final word.
const MAX_MB = Number(import.meta.env.VITE_VIDEO_MAX_MB || 25)
const MAX_BYTES = MAX_MB * 1024 * 1024
const ACCEPT = '.mp4,.mov,.webm,.mkv,.avi,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo'

/**
 * Single-video picker with local preview — mirrors ImageInput's shape, just
 * a <video> instead of an <img>. Emits { file, remove }.
 */
export function VideoInput({ currentUrl, posterUrl, onChange, error, label = 'Video', hint }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [removed, setRemoved] = useState(false)
  const [localError, setLocalError] = useState(null)

  const shownUrl = removed ? null : preview || resolveMediaUrl(currentUrl)

  function pick(file) {
    setLocalError(null)
    if (!file) return
    if (file.size > MAX_BYTES) {
      setLocalError(`Video must be under ${MAX_MB} MB — this file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Compress it or choose a shorter clip.`)
      if (inputRef.current) inputRef.current.value = ''
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
          {localError || error ? (
            <p className="text-xs text-[var(--color-danger)]">{localError || error}</p>
          ) : (
            <p className="text-xs text-[var(--color-faint)]">
              {hint || `MP4, MOV, WebM, MKV or AVI · up to ${MAX_MB} MB · compressed automatically`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
