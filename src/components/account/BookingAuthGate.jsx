import { X } from 'lucide-react'
import GoogleButton from './GoogleButton'

/**
 * Shown when a guest tries to move past the booking form into the
 * confirm/pay step. Booking.jsx has already stashed the in-progress
 * selections in sessionStorage (see BOOKING_DRAFT_KEY) before rendering this,
 * so the Google authentication round trip can return the visitor to the
 * booking section with everything preserved (see Booking.jsx's draft-restore
 * effect).
 *
 * Customer authentication is intentionally Google-only in this UI.
 * The underlying authentication infrastructure remains unchanged.
 */
export default function BookingAuthGate({ onClose }) {
  const returnTo = '/booking'

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-ink/40 p-0"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-0 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to continue booking"
          className="w-full max-w-md rounded-t-[var(--radius-lg,0.75rem)] border border-line bg-surface p-6 shadow-xl sm:rounded-[var(--radius-lg,0.75rem)] sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Almost there</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">
                Sign in to confirm your booking
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn-ghost -m-1 shrink-0 rounded p-1.5 text-muted hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 text-sm text-ink-soft">
            Your selections are saved. Sign in with Google to submit your
            appointment and keep track of it afterwards.
          </p>

          <div className="mt-6">
            <GoogleButton redirectTo={returnTo} />
          </div>

          {/*
            Email/password and manual account creation are intentionally
            disabled from the booking authentication UI.

            The previous UI included:
            - OR divider
            - Log in button
            - Create account button

            Those controls are kept commented out rather than deleted so the
            change remains reversible without modifying the underlying
            authentication infrastructure.
          */}

          {/*
          <div className="my-5 flex items-center gap-4 text-xs uppercase tracking-[0.14em] text-muted">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            or
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="btn w-full justify-center"
              onClick={() => navigate('/login', { state: { from: returnTo } })}
            >
              Log in
            </button>

            <button
              type="button"
              className="btn btn-outline w-full justify-center"
              onClick={() => navigate('/register', { state: { from: returnTo } })}
            >
              Create account
            </button>
          </div>
          */}
        </div>
      </div>
    </div>
  )
}