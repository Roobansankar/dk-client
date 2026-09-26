import { Link } from 'react-router-dom'
import Container from '../components/layout/Container'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found — DK StyleHub" noindex />

      <Container className="section-y">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4">Page not found</h1>
        <p className="measure mt-4 text-ink-soft">
          The page you are looking for does not exist or has moved.
        </p>
        <Link to="/" className="btn mt-8 no-underline">
          Back to home
        </Link>
      </Container>
    </>
  )
}
