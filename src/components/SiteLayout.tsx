import { Link, Outlet } from 'react-router-dom'

const SITE_NAME = '73'
const SITE_DOMAIN = 'seventhree.dev'

export function SiteLayout() {
  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="brand">
          <img
            className="brand-mark"
            src="/logo-73.jpg"
            alt={SITE_NAME}
            width={100}
            height={100}
          />
        </Link>
        <nav className="site-nav">
          <Link to="/">Apps</Link>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>
          {SITE_DOMAIN} — personal project space. Nothing here is affiliated with
          any game publisher.
        </p>
      </footer>
    </div>
  )
}
