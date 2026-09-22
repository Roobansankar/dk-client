// The admin area shares the site-wide API client — one fetch layer, one auth
// story, no duplicate client. This re-export keeps every existing admin
// `from '../lib/api'` / `from './api'` import working unchanged.
export { api, ApiError, tokenStore, setUnauthorizedHandler, API_BASE } from '../../lib/api'
