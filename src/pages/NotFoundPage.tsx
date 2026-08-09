import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="detail">
      <h1 className="detail-title">Page not found</h1>
      <p className="detail-description">
        That link does not point to anything (yet).
      </p>
      <Link to="/" className="button button-primary">
        Back to apps
      </Link>
    </section>
  )
}
