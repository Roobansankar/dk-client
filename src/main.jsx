import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Drop index.html's static SEO defaults (kept for non-JS crawlers/link
// previews) so each route's own <Seo> tags are the only ones in <head>.
document.querySelectorAll('head [data-seo-default]').forEach((node) => node.remove())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * Dismiss the pre-React preloader (see index.html) once the app has painted its
 * first frame. No artificial minimum delay; the CSS fade is short and the node
 * is left in the DOM (hidden) so nothing reflows.
 */
function dismissPreloader() {
  const el = document.getElementById('preloader')
  if (!el) return
  document.documentElement.classList.add('is-hydrated')
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    el.remove()
    return
  }
  el.addEventListener('transitionend', () => el.remove(), { once: true })
  // Safety net if the transitionend never fires.
  setTimeout(() => el.remove(), 800)
}

requestAnimationFrame(() => requestAnimationFrame(dismissPreloader))
