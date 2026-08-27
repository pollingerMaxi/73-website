import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppCard } from '../components/AppCard'
import { listApps } from '../domain/appCatalog'

export function HomePage() {
  const apps = listApps()

  useDocumentTitle()

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">Game automations</p>
        <h1 className="hero-title">Small tools that play the boring parts for you</h1>
        <p className="hero-subtitle">
          Automation apps for browser, Android and iOS. Pick one to see what it
          does and how to get it.
        </p>
      </section>

      <section className="app-grid" aria-label="Available apps">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </section>
    </>
  )
}
