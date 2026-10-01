import { useId, useState } from 'react'
import { Star } from 'lucide-react'
import Container from '../layout/Container'
import { api, ApiError } from '../../lib/api'

const MAX_LENGTH = 2000
const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink'

/** Five clickable stars — `value` is the current rating (0 = none picked yet). */
function StarPicker({ value, onChange, error }) {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value

  return (
    <div role="radiogroup" aria-label="Rating" aria-invalid={error ? 'true' : undefined}>
      <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(n)}
            onClick={() => onChange(n)}
            className="p-0.5 text-accent transition-transform hover:scale-110"
          >
            <Star
              size={26}
              strokeWidth={1.5}
              fill={n <= shown ? 'currentColor' : 'none'}
              className={n <= shown ? 'text-accent' : 'text-line-strong'}
            />
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm text-ink">{error}</p>}
    </div>
  )
}

function ReviewForm() {
  const uid = useId()
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  if (successMessage) {
    return (
      <div className="border-l-2 border-line-strong pl-4">
        <p className="text-ink">{successMessage}</p>
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const errors = {}
    if (!name.trim()) errors.reviewer_name = 'Please enter your name.'
    if (!rating) errors.rating = 'Please choose a star rating.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const { message } = await api.post('/reviews', {
        reviewer_name: name.trim(),
        rating,
        review_text: text.trim(),
      })
      setSuccessMessage(message || 'Thanks for your review! It’ll appear on the site once approved.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError('Please check the highlighted fields and try again.')
      } else if (err instanceof ApiError && err.network) {
        setFormError('We couldn’t reach the server. Please check your connection and try again.')
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor={`${uid}-name`} className="eyebrow block">
          Your name
        </label>
        <input
          id={`${uid}-name`}
          maxLength={255}
          required
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setFieldErrors((prev) =>
              prev.reviewer_name ? { ...prev, reviewer_name: undefined } : prev,
            )
          }}
          aria-invalid={Boolean(fieldErrors.reviewer_name)}
          className={FIELD}
        />
        {fieldErrors.reviewer_name && (
          <p className="mt-1.5 text-sm text-ink">{fieldErrors.reviewer_name}</p>
        )}
      </div>

      <div className="mt-5">
        <span className="eyebrow block">Your rating</span>
        <div className="mt-2">
          <StarPicker
            value={rating}
            onChange={(n) => {
              setRating(n)
              setFieldErrors((prev) => (prev.rating ? { ...prev, rating: undefined } : prev))
            }}
            error={fieldErrors.rating}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={`${uid}-text`} className="eyebrow block">
          Your review
        </label>
        <textarea
          id={`${uid}-text`}
          rows={4}
          maxLength={MAX_LENGTH}
          required
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setFieldErrors((prev) => (prev.review_text ? { ...prev, review_text: undefined } : prev))
          }}
          placeholder="Tell us about your visit…"
          className={FIELD}
        />
        {fieldErrors.review_text && (
          <p className="mt-1.5 text-sm text-ink">{fieldErrors.review_text}</p>
        )}
      </div>

      {formError && (
        <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
          {formError}
        </p>
      )}

      <button type="submit" className="btn mt-6" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}

/**
 * "Review Us" — lets a visitor submit their own review of the studio
 * (`POST /api/reviews`), no account needed. A submission is never shown publicly right
 * away: it joins the same admin Reviews queue as a staff-entered Google
 * review, unpublished until approved (see admin/pages/Reviews.jsx) — this
 * form only ever confirms it was received, never that it's live.
 */
export default function ReviewUs() {
  return (
    <div id="review-us" className="scroll-mt-20 border-t border-line bg-paper">
      <Container className="section-y">
        <div className="mx-auto max-w-lg text-center">
          <p className="eyebrow">Review us</p>
          <h2 className="mt-4 font-serif text-2xl text-ink sm:text-3xl">
            Tell us about your visit.
          </h2>
          <p className="mt-3 text-ink-soft">
            Your review is checked by the studio before it appears on our
            homepage — thank you for taking the time to share it.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <ReviewForm />
        </div>
      </Container>
    </div>
  )
}
