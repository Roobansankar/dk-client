import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'

/** Public, indexable routes (everything else is noindex or disallowed). */
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/services', priority: '0.9', changefreq: 'weekly' },
  { path: '/services/men', priority: '0.8', changefreq: 'weekly' },
  { path: '/services/women', priority: '0.8', changefreq: 'weekly' },
  { path: '/booking', priority: '0.8', changefreq: 'monthly' },
  { path: '/products', priority: '0.8', changefreq: 'weekly' },
  { path: '/gallery', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
]

const xmlEscape = (v) =>
  String(v).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])

/** GET `${api}${path}` → `data` array, or [] if the API isn't reachable at build time. */
async function fetchList(api, path) {
  try {
    const res = await fetch(`${api}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch (err) {
    console.warn(`[seo] ${path}: skipped in sitemap (${err.message})`)
    return []
  }
}

/**
 * Build-time SEO files:
 *  - robots.txt — allows the public site, keeps crawlers out of the admin,
 *    account, cart/checkout and API areas, and points at the sitemap.
 *  - sitemap.xml — the public canonical routes above, plus every active
 *    product and combo page from the live API (skipped with a warning if the
 *    API can't be reached during the build; re-run the build to refresh).
 *  - rewrites index.html's static default URLs to VITE_SITE_URL.
 */
function seoFiles(siteUrl, apiUrl) {
  return {
    name: 'dk-seo-files',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replaceAll('https://dkstylehub.com', siteUrl)
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /account',
          'Disallow: /cart',
          'Disallow: /checkout',
          'Disallow: /auth/',
          'Disallow: /api/',
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      })

      const [products, combos] = await Promise.all([
        fetchList(apiUrl, '/products'),
        fetchList(apiUrl, '/combos'),
      ])
      const day = (d) => (d ? String(d).slice(0, 10) : null)
      const urls = [
        ...STATIC_ROUTES.map((r) => ({ ...r, loc: `${siteUrl}${r.path === '/' ? '/' : r.path}` })),
        ...products
          .filter((p) => p.slug && p.status !== false)
          .map((p) => ({ loc: `${siteUrl}/products/${p.slug}`, lastmod: day(p.updated_at), priority: '0.6', changefreq: 'weekly' })),
        ...combos
          .filter((c) => c.slug)
          .map((c) => ({ loc: `${siteUrl}/combos/${c.slug}`, lastmod: day(c.updated_at), priority: '0.5', changefreq: 'weekly' })),
      ]

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls
            .map(
              (u) =>
                `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n` +
                (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
                `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
            )
            .join('\n') +
          '\n</urlset>\n',
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL || 'https://dkstylehub.com').replace(/\/+$/, '')
  const apiUrl = (env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')

  return {
  plugins: [react(), tailwindcss(), seoFiles(siteUrl, apiUrl)],
  // --- Performance: small initial bundle, smooth long-term caching ---
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    // Don't inline big images as base64 (default 4KB keeps tiny icons
    // inline but forces photos/logos into separate cacheable files).
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Vendor split: react/router/motion change rarely → cached for
        // months; route chunks change often → small re-downloads.
        // (Function form — required by Vite 8's Rolldown bundler.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]react(-dom|-router)?[\\/]/.test(id) || id.includes('react-router-dom')) return 'vendor-react'
          if (/[\\/]node_modules[\\/](gsap|lenis)[\\/]/.test(id)) return 'vendor-motion'
          if (/[\\/]node_modules[\\/](lucide-react|clsx|tailwind-merge)[\\/]/.test(id)) return 'vendor-ui'
          return 'vendor'
        },
      },
    },
  },
  server: {
    // Pinned (not `strictPort`, so it still auto-increments with a warning if
    // 5175 is genuinely taken) rather than left to Vite's default 5173: the
    // Google OAuth client's "Authorized JavaScript origin" and the backend's
    // FRONTEND_URL (see backend/.env / config/salon.php) are both fixed at
    // http://localhost:5175. Without pinning this, which port a fresh `npm
    // run dev` lands on depends on how many other unrelated dev servers are
    // already running, and the Google login redirect silently breaks
    // (ERR_CONNECTION_REFUSED) whenever it lands anywhere else.
    port: 5175,
    proxy: {
      // Dev only: proxy API calls to `php artisan serve` so the browser talks
      // to a single origin (this dev server) instead of cross-origin to :8000.
      // Fixes the localhost(::1)-vs-127.0.0.1 binding split (Vite serves over
      // IPv6, artisan over IPv4) and removes CORS from local development.
      // Production builds don't run a dev server, so they're unaffected.
      '/api': {
        target: 'https://dkstylehub.com',
        changeOrigin: true,
      },
    },
  },
}
})
