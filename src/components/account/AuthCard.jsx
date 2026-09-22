import Container from '../layout/Container'

/**
 * Shared shell for the login/register/forgot-password/reset-password pages —
 * a single narrow bordered panel using the site's existing tokens (no new
 * design system), consistent with the review-step panels in Booking.jsx.
 */
export default function AuthCard({ eyebrow, title, description, children }) {
  return (
    <div className="border-t border-line bg-surface">
      <Container className="section-y flex justify-center">
        <div className="w-full max-w-md">
          <p className="eyebrow text-center">{eyebrow}</p>
          <h1 className="mt-3 text-center font-serif text-3xl text-ink">{title}</h1>
          {description && (
            <p className="mt-3 text-center text-ink-soft">{description}</p>
          )}
          <div className="mt-8 border-t border-line pt-8">{children}</div>
        </div>
      </Container>
    </div>
  )
}
