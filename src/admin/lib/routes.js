/**
 * The admin area is mounted at `/admin/*` inside the public React app
 * (see ../../App.jsx). Any in-app admin link written as an absolute path must
 * carry that prefix, or React Router hands it to the public router and it 404s.
 *
 * Build admin URLs through `adminPath()` so the prefix lives in one place.
 * `<NavLink>`s in Layout.jsx already spell out `/admin/...` and are left as-is;
 * this helper is for the paths that were missing the prefix.
 */
export const ADMIN_BASE = '/admin'

export function adminPath(path = '') {
  const p = String(path).replace(/^\/+/, '')
  return p ? `${ADMIN_BASE}/${p}` : ADMIN_BASE
}
