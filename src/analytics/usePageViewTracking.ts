import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from './analytics'

/**
 * Sends one page view per route change.
 *
 * Called from the layout rather than the router root on purpose: React runs a child's effects before
 * its parent's, so the page component's title effect has already run by the time this fires, and the
 * view is reported against the title the visitor actually saw.
 *
 * The guard makes a repeated effect for one location a no-op. StrictMode runs every effect twice in
 * development, which would double every view; rather than trust that this never happens in a
 * production build, the hook simply refuses to report the same location twice in a row.
 */
export function usePageViewTracking(): void {
  const { pathname, search } = useLocation()
  const lastReportedLocation = useRef<string>('')

  useEffect(() => {
    const location = pathname + search
    if (lastReportedLocation.current === location) return

    lastReportedLocation.current = location
    trackPageView(document.title)
  }, [pathname, search])
}
