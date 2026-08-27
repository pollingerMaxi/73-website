import { useEffect } from 'react'

const SITE_TITLE = '73 — apps and automation tools'

/**
 * Names the current page.
 *
 * Worth having for its own sake, and analytics depends on it: without per-route titles every view in
 * the report carries the same name and the pages become impossible to tell apart.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — 73` : SITE_TITLE
  }, [title])
}
