import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
