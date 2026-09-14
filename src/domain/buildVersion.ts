/**
 * How a page already open in somebody's browser finds out it is out of date.
 *
 * GitHub Pages serves `index.html` with a cache lifetime of its own, and that one file names every
 * hashed asset the site loads. A returning visitor can therefore be handed a perfectly valid page
 * from a week ago — old markup, old bundle, none of whatever shipped since — and nothing on the
 * page can tell, because from its point of view it loaded successfully. Only a force reload used to
 * fix it, which is not something a visitor knows to do.
 *
 * So every build stamps itself with an id, publishes that same id in a small file beside the site,
 * and the running page compares the two.
 */

import { BUILD_MANIFEST_FILE, type BuildManifest } from './buildManifest'

const BUILD_MANIFEST_URL = `/${BUILD_MANIFEST_FILE}`

/** The build this page was loaded from, stamped in at build time by `vite.config.ts`. */
export function readRunningBuildId(): string {
  return import.meta.env.VITE_BUILD_ID
}

/**
 * The build currently deployed, or `null` when that cannot be established.
 *
 * Fetched with `cache: 'no-store'` because a cached answer to "am I looking at a cached copy?" is
 * worth nothing. A failure here — offline, or the dev server, which publishes no manifest — is not
 * an error the visitor needs to hear about; it only means this check has nothing to say.
 */
export async function fetchDeployedBuildId(): Promise<string | null> {
  try {
    const response = await fetch(BUILD_MANIFEST_URL, { cache: 'no-store' })
    if (!response.ok) return null

    const manifest: BuildManifest = await response.json()
    return typeof manifest.buildId === 'string' ? manifest.buildId : null
  } catch {
    return null
  }
}
