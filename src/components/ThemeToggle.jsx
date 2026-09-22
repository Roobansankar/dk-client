import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../context/ThemeContext'

const META = {
  light: { Icon: Sun, label: 'Light theme' },
  dark: { Icon: Moon, label: 'Dark theme' },
}

/**
 * Light / dark theme toggle. A plain two-state switch: it shows the icon for
 * the *resolved* theme and flips to the other on click or Enter/Space (native
 * <button>). `onDark` restyles it for the transparent-over-hero navbar state —
 * `lg:`-scoped, since the mobile + tablet navbar (< lg) is always a solid surface.
 *
 * 'system' stays a valid stored/initial preference (ThemeContext + the
 * index.html pre-paint script still honour it, so first-time visitors follow
 * their OS) — the toggle simply never returns to it, so there is no third
 * "system / monitor" control in the UI.
 */
export default function ThemeToggle({ onDark = false, className }) {
  const { resolved, cycle } = useTheme()
  const { Icon, label } = META[resolved] ?? META.light
  const next = resolved === 'dark' ? META.light : META.dark

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Switch to ${next.label.toLowerCase()}.`}
      title={`${label} — click to change`}
      className={clsx(
        '-mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        // Solid-surface styling is the base (mobile + tablet navbar + drawer);
        // the over-hero white treatment is layered on from `lg` up only.
        'text-ink-soft hover:bg-surface-sunken hover:text-ink',
        onDark &&
          'lg:text-white lg:[text-shadow:0_1px_10px_rgb(0_0_0/0.4)] lg:hover:bg-white/10 lg:hover:text-white',
        className,
      )}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
