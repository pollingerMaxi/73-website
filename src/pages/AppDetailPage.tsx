import { Link, useParams } from 'react-router-dom'
import { PlatformIcon } from '../components/PlatformIcon'
import { StatusBadge } from '../components/StatusBadge'
import { PLATFORM_LABELS, findAppById } from '../domain/appCatalog'
import { NotFoundPage } from './NotFoundPage'

export function AppDetailPage() {
  const { appId } = useParams()
  const app = findAppById(appId)

  if (!app) {
    return <NotFoundPage />
  }

  return (
    <article className="detail">
      <Link to="/" className="back-link">
        ← Back to apps
      </Link>

      <div className="card-head">
        <PlatformIcon platform={app.platform} />
        <span className="card-platform">{PLATFORM_LABELS[app.platform]}</span>
        <StatusBadge status={app.status} />
      </div>

      <h1 className="detail-title">{app.name}</h1>
      <p className="detail-tagline">{app.tagline}</p>
      <p className="detail-description">{app.description}</p>

      <h2 className="detail-section-title">What it does</h2>
      <ul className="feature-list">
        {app.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      {app.download ? (
        <a
          className="button button-primary"
          href={app.download.url}
          target="_blank"
          rel="noreferrer"
        >
          {app.download.label}
        </a>
      ) : (
        <p className="detail-note">
          Not published yet — this page is the placeholder where the download
          link will live.
        </p>
      )}
    </article>
  )
}
