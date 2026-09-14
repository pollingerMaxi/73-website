/**
 * The contract between the build that publishes the site and the page that runs on it.
 *
 * Its own file because both ends need it and they live in different TypeScript projects: the writer
 * is `vite.config.ts`, running in Node, and the reader is `buildVersion.ts`, running in a browser.
 * A file name agreed by being typed out twice is a file name that eventually disagrees.
 */

/** Published at the site root by the build. */
export const BUILD_MANIFEST_FILE = 'version.json'

export interface BuildManifest {
  readonly buildId: string
}
