import { Link, Outlet } from 'react-router-dom'
import { NavMenu } from './NavMenu'

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
        <NavMenu />
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>
          {SITE_DOMAIN} is a personal, non-commercial project by an independent
          developer. The tools listed here are built for my own use and shared
          as-is, free of charge, with no warranty of any kind.
        </p>
        <p>
          Nothing on this site is affiliated with, endorsed by, or connected to any
          game, developer or publisher. All game names and trademarks belong to
          their respective owners and are used only to describe what a tool works
          with. Automating a game may breach its terms of service, and doing so is
          your own decision and your own risk — please read the{' '}
          <Link to="/disclaimer">full disclaimer</Link>.
        </p>
      </footer>
    </div>
  )
}
