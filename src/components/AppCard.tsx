import { Link } from 'react-router-dom'
import { PLATFORM_LABELS, type AppEntry } from '../domain/appCatalog'
import { trackAppCardClick } from '../analytics/events'
import { PlatformIcon } from './PlatformIcon'
import { StatusBadge } from './StatusBadge'

interface AppCardProps {
  app: AppEntry
}

export function AppCard({ app }: AppCardProps) {
  return (
    <article className="card">
      <div className="card-head">
        <PlatformIcon platform={app.platform} />
        <span className="card-platform">{PLATFORM_LABELS[app.platform]}</span>
        <StatusBadge status={app.status} />
      </div>

      <h3 className="card-title">{app.name}</h3>
      <p className="card-tagline">{app.tagline}</p>

      <Link
        to={`/apps/${app.id}`}
        className="button button-primary"
        onClick={() => trackAppCardClick(app.id, app.name, app.status)}
      >
        View details
      </Link>
    </article>
  )
}
