/**
 * Centralised frontend environment/URL config — the one place that knows
 * about `VITE_API_URL`, this page's own origin, and how to turn a
 * backend-supplied media path into a URL the browser can load. Nothing here
 * is a secret; only `VITE_*` build-time values and runtime `window` state
 * belong in this file.
 *
 * Google OAuth is deliberately NOT duplicated here: the full "continue with
 * Google" round trip (client id, redirect URI, and where to bounce back to
 * after the callback) is entirely backend-driven — see backend
 * `config/services.php` (`google.redirect`, from `GOOGLE_REDIRECT_URI`) and
 * `config/salon.php` (`frontend_url`, from `FRONTEND_URL`). The frontend only
 * ever calls `GET /account/google/redirect` (see GoogleButton.jsx) and
 * follows the URL it returns, then lands on the fixed `/auth/google/callback`
 * route — there is no environment-specific Google URL for this file to hold.
 */

/**
 * API base URL. Production uses the absolute `VITE_API_URL` verbatim. In dev
 * we collapse a loopback URL (localhost / 127.0.0.1 / ::1) down to just its
 * path, so requests go through the Vite dev-server proxy (see
 * vite.config.js) as same-origin calls. That sidesteps CORS and the
 * localhost(::1)-vs-127.0.0.1 split between the browser (Vite binds IPv6)
 * and `php artisan serve` (IPv4).
 */
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  if (import.meta.env.DEV) {
    try {
      const u = new URL(raw)
      if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(u.hostname)) {
        return `${u.pathname}${u.search}`.replace(/\/+$/, '') || '/api'
      }
    } catch {
      /* `raw` is already a relative path — fall through */
    }
  }
  return raw.replace(/\/+$/, '')
}

export const API_BASE = resolveApiBase()

/**
 * This page's own origin (scheme + host[:port]) — whichever domain actually
 * served this build (localhost:5175 in dev, https://dkstylehub.com in
 * production). Read live from `window`, never baked in at build time, so one
 * build works unmodified on every environment.
 */
export const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

/**
 * Normalise a media URL returned by the API — product/gallery/stylist/
 * service-category images and review avatars, all served through the
 * backend's `ImageUploader` → `Storage::disk('public')->url()`. The backend
 * always hands back an absolute `APP_URL + /storage/...` URL already; this
 * only guards the rare case of a relative path slipping through, resolving
 * it against the SITE origin — deliberately never against `API_BASE`, since
 * that would silently turn `/storage/...` into `/api/storage/...`, the exact
 * production bug this project hit once already.
 */
export function resolveMediaUrl(url) {
  if (!url) return null
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  try {
    return new URL(url, SITE_ORIGIN).toString()
  } catch {
    return url
  }
}
