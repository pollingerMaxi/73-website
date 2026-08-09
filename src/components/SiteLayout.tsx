import { Link, Outlet } from 'react-router-dom'

const SITE_NAME = '73'
const SITE_DOMAIN = '73.com.uy'

export function SiteLayout() {
  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">{SITE_NAME}</span>
          <span className="brand-domain">{SITE_DOMAIN}</span>
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
