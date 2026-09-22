/**
 * Single API client for the DK StyleHub app — used by both the public site
 * (anonymous GET/POST) and the merged /admin area (authenticated REST + file
 * uploads). One place that knows the base URL, the bearer token and the
 * response shape, so there is exactly one fetch layer and one auth story.
 *
 * Laravel wraps payloads in `{ data: ... }` (paginated ones add `meta`/`links`)
 * and returns `{ message, errors }` on validation failure. `apiGet`/`apiPost`
 * unwrap straight to `data` for the public hooks; `api.*` keeps `meta`/`links`
 * for admin list views.
 */

// API base URL resolution lives in `./env` — the one centralised module for
// frontend URL/environment config (also home to `resolveMediaUrl`, used by
// the public data hooks and admin image components).
import { API_BASE } from './env'

const ADMIN_TOKEN_KEY = 'dk-admin-token'
const CUSTOMER_TOKEN_KEY = 'dk-customer-token'

function makeTokenStore(key) {
  return {
    get: () => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    set: (t) => {
      try {
        if (t) localStorage.setItem(key, t)
        else localStorage.removeItem(key)
      } catch {
        /* private mode — session only */
      }
    },
  }
}

/** Staff/admin-panel session (unchanged key/shape — every existing import keeps working). */
export const tokenStore = makeTokenStore(ADMIN_TOKEN_KEY)

/**
 * Customer (public site) session — a separate token/localStorage slot so a
 * staff member and a customer signed in on the same browser never clobber
 * each other's session.
 */
export const customerTokenStore = makeTokenStore(CUSTOMER_TOKEN_KEY)

/** `/admin/*` and staff `/auth/*` use the admin token; everything else (incl. `/account/*`) uses the customer token. */
function isAdminPath(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return p.startsWith('/admin') || p.startsWith('/auth')
}

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, errors?: Record<string, string[]>, network?: boolean }} [meta]
   */
  constructor(message, { status = 0, errors = null, network = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.network = network
  }

  /** First message per field, for inline form display. */
  fieldErrors() {
    if (!this.errors) return {}
    return Object.fromEntries(
      Object.entries(this.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
    )
  }
}

const NETWORK_MESSAGE =
  'We couldn’t reach the server. Please check your connection and try again.'

/** Callbacks invoked on a 401 from the matching session, so the app can drop it. */
let onAdminUnauthorized = () => {}
let onCustomerUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onAdminUnauthorized = fn
}
export const setCustomerUnauthorizedHandler = (fn) => {
  onCustomerUnauthorized = fn
}

async function request(method, path, { body, params, signal } = {}) {
  const admin = isAdminPath(path)
  const url = new URL(
    `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`,
    window.location.origin,
  )
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }

  const headers = { Accept: 'application/json' }
  const token = admin ? tokenStore.get() : customerTokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, { method, headers, body: payload, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(NETWORK_MESSAGE, { network: true })
  }

  if (res.status === 204) return null

  const text = await res.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!res.ok) {
    if (res.status === 401) (admin ? onAdminUnauthorized : onCustomerUnauthorized)()
    throw new ApiError(json?.message || `Request failed (${res.status}).`, {
      status: res.status,
      errors: json?.errors ?? null,
    })
  }

  return json
}

/** Fetch a binary response (e.g. a generated PDF) as a Blob. */
async function requestBlob(path, params) {
  const admin = isAdminPath(path)
  const url = new URL(
    `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`,
    window.location.origin,
  )
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }
  const headers = {}
  const token = admin ? tokenStore.get() : customerTokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { headers })
  } catch {
    throw new ApiError(NETWORK_MESSAGE, { network: true })
  }
  if (!res.ok) {
    if (res.status === 401) (admin ? onAdminUnauthorized : onCustomerUnauthorized)()
    let body = null
    try {
      body = JSON.parse(await res.text())
    } catch {
      /* non-json error */
    }
    throw new ApiError(body?.message || `Request failed (${res.status}).`, {
      status: res.status,
      errors: body?.errors ?? null,
    })
  }
  return res.blob()
}

/** Unwrap Laravel's `{ data }` envelope straight to the value (public hooks). */
const unwrapData = (json) =>
  json && typeof json === 'object' && 'data' in json ? json.data : json

/**
 * Keep `data`/`meta`/`links` (and any `->additional()` extras) for admin list
 * views that need pagination metadata.
 */
function unwrapMeta(json) {
  if (json && typeof json === 'object' && 'data' in json) {
    const { data, meta = null, links = null, ...rest } = json
    return { data, meta, links, ...rest }
  }
  return { data: json, meta: null, links: null }
}

export const apiGet = (path, opts) => request('GET', path, opts).then(unwrapData)
export const apiPost = (path, body, opts) => request('POST', path, { ...opts, body }).then(unwrapData)

export const api = {
  raw: request,
  get: (path, opts) => request('GET', path, opts).then(unwrapMeta),
  post: (path, body, opts) => request('POST', path, { ...opts, body }).then(unwrapMeta),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }).then(unwrapMeta),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }).then(unwrapMeta),
  delete: (path, opts) => request('DELETE', path, opts),

  /**
   * Multipart update. Laravel doesn't parse a body on PUT/PATCH multipart
   * requests, so spoof the method with POST + _method.
   */
  postForm: (path, formData) => request('POST', path, { body: formData }).then(unwrapMeta),
  putForm: (path, formData) => {
    formData.append('_method', 'PUT')
    return request('POST', path, { body: formData }).then(unwrapMeta)
  },

  /** Download a binary file (PDF, etc.) and trigger a save in the browser. */
  download: async (path, params, filename) => {
    const blob = await requestBlob(path, params)
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  },
}

export { API_BASE }
