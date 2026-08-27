import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { trackMenuClick, trackMenuToggled } from '../analytics/events'
import { listApps } from '../domain/appCatalog'
import { StatusBadge } from './StatusBadge'

const MENU_ID = 'primary-menu'

export function NavMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setIsOpen(false), [pathname])

  useEffect(() => {
    if (!isOpen) return

    function closeAndRestoreFocus() {
      setIsOpen(false)
      toggleRef.current?.focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAndRestoreFocus()
    }

    function handlePointerDown(event: PointerEvent) {
      const clickedInside = containerRef.current?.contains(event.target as Node)
      if (!clickedInside) setIsOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  return (
    <div className="nav" ref={containerRef}>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-controls={MENU_ID}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => {
          // Reporting happens here rather than inside the state updater: React may call an
          // updater more than once, and an updater that is not pure would report each time.
          trackMenuToggled(!isOpen)
          setIsOpen(!isOpen)
        }}
      >
        <span className="nav-toggle-bars" aria-hidden="true" />
      </button>

      {isOpen && (
        <nav className="nav-panel" id={MENU_ID} aria-label="Primary">
          <Link to="/" className="nav-link" onClick={() => trackMenuClick('Home', '/')}>
            Home
          </Link>

          <p className="nav-heading">Apps</p>
          {listApps().map((app) => (
            <Link
              key={app.id}
              to={`/apps/${app.id}`}
              className="nav-link nav-link-app"
              onClick={() => trackMenuClick(app.name, `/apps/${app.id}`)}
            >
              <span className="nav-link-name">{app.name}</span>
              <StatusBadge status={app.status} />
            </Link>
          ))}

          <Link
            to="/disclaimer"
            className="nav-link nav-link-secondary"
            onClick={() => trackMenuClick('Disclaimer', '/disclaimer')}
          >
            Disclaimer
          </Link>
        </nav>
      )}
    </div>
  )
}
