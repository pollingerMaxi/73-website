import { Link, useParams } from 'react-router-dom'
import { trackBackToApps, trackOutboundClick } from '../analytics/events'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PlatformIcon } from '../components/PlatformIcon'
import { SideloadDownload } from '../components/SideloadDownload'
import { StatusBadge } from '../components/StatusBadge'
import { PLATFORM_LABELS, findAppById } from '../domain/appCatalog'
import { NotFoundPage } from './NotFoundPage'

export function AppDetailPage() {
  const { appId } = useParams()
  const app = findAppById(appId)

  // Matches the title NotFoundPage sets, so the fallback below does not report two different
  // titles for the same view.
  useDocumentTitle(app ? app.name : 'Page not found')

  if (!app) {
    return <NotFoundPage />
  }

  return (
    <article className="detail">
      <Link
        to="/"
        className="back-link"
        onClick={() => trackBackToApps(app.id)}
      >
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

      {app.limitations ? (
        <>
          <h2 className="detail-section-title">What it does not do</h2>
          <ul className="feature-list">
            {app.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </>
      ) : null}

      {app.setup ? (
        <>
          <h2 className="detail-section-title">Setting it up</h2>
          <ol className="setup-list">
            {app.setup.map((step) => (
              <li key={step.title}>
                <strong className="setup-step-title">{step.title}</strong>
                <span className="setup-step-detail">
                  {step.detail}
                  {step.link ? (
                    <>
                      {' '}
                      <a
                        href={step.link.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          trackOutboundClick(step.link!.url, step.link!.label, app.id)
                        }
                      >
                        {step.link.label}
                      </a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {app.sideload ? (
        <SideloadDownload
          appId={app.id}
          manifestUrl={app.sideload.manifestUrl}
          installsAs={app.sideload.installsAs}
        />
      ) : app.download ? (
        <a
          className="button button-primary"
          href={app.download.url}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackOutboundClick(app.download!.url, app.download!.label, app.id)
          }
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
