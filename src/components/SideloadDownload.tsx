import { useEffect, useState } from 'react'

/**
 * What the release pipeline writes beside the APK on every build.
 *
 * Read at runtime rather than baked into the site, so publishing a new version is one push from the
 * app's own repository and nothing here has to be edited to keep up. A page that hardcodes a version
 * number is a page that is wrong from the next release onwards.
 */
interface BuildManifest {
  readonly version: string
  readonly apk: string
  readonly sha256: string
  readonly bytes: number
  readonly released: string
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly manifest: BuildManifest }
  | { readonly kind: 'unavailable' }

/**
 * The download for an app that is installed by hand rather than from a store.
 *
 * This deliberately says more than a download button usually does. Installing an APK means turning
 * off a protection Android puts up on purpose, and this app then asks for an accessibility service
 * and screen capture — the two permissions a malicious app most wants. Somebody deciding whether to
 * trust that deserves the checksum, the version, and a straight answer about what the checksum does
 * and does not prove.
 */
export function SideloadDownload({ manifestUrl }: { readonly manifestUrl: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(manifestUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((manifest: BuildManifest) => {
        if (!cancelled) setState({ kind: 'ready', manifest })
      })
      .catch(() => {
        // No manifest means no build has been published yet, which is a normal state for this page
        // to be in and not an error worth showing anybody a stack trace over.
        if (!cancelled) setState({ kind: 'unavailable' })
      })

    return () => {
      cancelled = true
    }
  }, [manifestUrl])

  if (state.kind === 'loading') {
    return <p className="detail-note">Looking up the latest build…</p>
  }

  if (state.kind === 'unavailable') {
    return (
      <p className="detail-note">
        No build published yet. This is where the download will be.
      </p>
    )
  }

  const { manifest } = state

  return (
    <section className="sideload">
      <a className="button button-primary" href={manifest.apk} download>
        Download {manifest.version} for Android
      </a>

      <dl className="sideload-facts">
        <div>
          <dt>Version</dt>
          <dd>{manifest.version}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatSize(manifest.bytes)}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{formatDate(manifest.released)}</dd>
        </div>
      </dl>

      <h2 className="detail-section-title">Check what you downloaded</h2>
      <p className="sideload-prose">
        Run this against the file and compare it with the checksum below. Matching means the download
        arrived intact and is the file this site published.
      </p>
      <code className="sideload-command">shasum -a 256 73-automation.apk</code>
      <code className="sideload-hash">{manifest.sha256}</code>

      <h2 className="detail-section-title">Before you install it</h2>
      <p className="sideload-prose">
        This is not from an app store, so Android will ask you to allow installing unknown apps. It
        also needs an accessibility service and permission to record the screen — it has to see the
        game and tap it, and there is no other way for one app to do that. Those are the two
        permissions a malicious app most wants, so it is worth saying plainly: the source is not
        public, and the checksum above proves the file reached you intact, not what is inside it.
        Installing means trusting me.
      </p>
      <p className="sideload-prose">
        It also automates a game against that game&rsquo;s terms of service. Accounts get banned for
        this. Point it at one you would not mind losing.
      </p>
    </section>
  )
}

function formatSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/**
 * Formatted in the reader's own locale, from a UTC timestamp.
 *
 * The pipeline writes an ISO instant because that is unambiguous to store; a person reading a
 * download page wants the date their phone would show them.
 */
function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
