import { trackEvent } from './analytics'

/**
 * Every interaction the site reports, named once.
 *
 * Components call these rather than `trackEvent` directly, so event names and parameter shapes stay
 * consistent across the site. GA4 groups by exact string, and a name typed twice is two unrelated
 * rows in a report that should have been one.
 */

export function trackMenuToggled(isOpening: boolean): void {
  trackEvent(isOpening ? 'menu_open' : 'menu_close')
}

export function trackMenuClick(itemLabel: string, destination: string): void {
  trackEvent('menu_click', { menu_item: itemLabel, destination })
}

export function trackAppCardClick(
  appId: string,
  appName: string,
  appStatus: string,
): void {
  trackEvent('app_card_click', {
    app_id: appId,
    app_name: appName,
    app_status: appStatus,
  })
}

export function trackBackToApps(appId: string): void {
  trackEvent('back_to_apps', { app_id: appId })
}

/** `file_download` is a GA4 recommended event name, so it lands in the built-in reports. */
export function trackFileDownload(
  appId: string,
  fileUrl: string,
  version?: string,
): void {
  const fileName = fileUrl.split('/').pop() ?? fileUrl
  trackEvent('file_download', {
    app_id: appId,
    file_name: fileName,
    file_extension: fileName.split('.').pop(),
    app_version: version,
    link_url: fileUrl,
  })
}

export function trackOutboundClick(
  linkUrl: string,
  linkText: string,
  appId?: string,
): void {
  trackEvent('outbound_click', { link_url: linkUrl, link_text: linkText, app_id: appId })
}

export function trackFooterClick(destination: string): void {
  trackEvent('footer_click', { destination })
}
