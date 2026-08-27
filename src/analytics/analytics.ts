/**
 * Thin typed wrapper over the Google Analytics tag.
 *
 * Everything funnels through here so that components never touch the global directly, and so that a
 * missing tag is a non-event: gtag is absent whenever the script failed to load, which is the normal
 * case in local development and for anyone running a content blocker. Analytics must never be the
 * reason a button stops working.
 */
const MEASUREMENT_ID = 'G-SNXFTYLZHT'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: readonly unknown[]) => void
  }
}

export type EventParameters = Readonly<
  Record<string, string | number | boolean | undefined>
>

function send(...args: readonly unknown[]): void {
  window.gtag?.(...args)
}

/** GA4 rejects undefined values, and optional fields are common at the call sites. */
function withoutEmptyValues(parameters: EventParameters): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(parameters).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
    ),
  )
}

/**
 * Reports a view of the current route.
 *
 * The tag is configured with `send_page_view: false`, because on a client-routed site the tag's own
 * automatic view would fire once on load and never again. Every view, including the first, is sent
 * from here instead, so each route change counts exactly once.
 */
export function trackPageView(title: string): void {
  send('event', 'page_view', {
    page_location: window.location.href,
    page_title: title,
    send_to: MEASUREMENT_ID,
  })
}

export function trackEvent(name: string, parameters: EventParameters = {}): void {
  send('event', name, withoutEmptyValues(parameters))
}
