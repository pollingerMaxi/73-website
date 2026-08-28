import { useEffect, useState } from 'react'
import { trackFileDownload } from '../analytics/events'

/**
 * What the userscript build writes beside the script itself.
 *
 * Read at runtime rather than baked into the site, for the same reason the APK's is: a page that
 * hardcodes a version number is a page that is wrong from the next release onwards. The version
 * here is read back out of the built file, so it is the same string Tampermonkey compares.
 */
interface UserscriptManifest {
  readonly version: string
  readonly url: string
  readonly sha256: string
  readonly bytes: number
  readonly released: string
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly manifest: UserscriptManifest }
  | { readonly kind: 'unavailable' }

/**
 * The download for a userscript, which is a different proposition from an APK.
 *
 * Nothing is being installed into the operating system and no permission is being handed over, so
 * this says less than the Android download does. What it does say is the version, because that is
 * the one thing a reader cannot get from the file without opening it, and it is what tells them
 * whether the copy they already have is behind.
 */
export function UserscriptDownload({
  appId,
  manifestUrl,
}: {
  readonly appId: string
  readonly manifestUrl: string
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(manifestUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((manifest: UserscriptManifest) => {
        if (!cancelled) setState({ kind: 'ready', manifest })
      })
      .catch(() => {
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
      <a
        className="button button-primary"
        href={manifest.url}
        onClick={() => trackFileDownload(appId, manifest.url, manifest.version)}
      >
        Install {manifest.version} with Tampermonkey
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

      <p className="sideload-prose">
        Already installed? Tampermonkey checks this same address for a newer version on its own, so
        an existing copy updates itself — compare the number above with the one in your Tampermonkey
        dashboard if you want to be sure.
      </p>

      <h2 className="detail-section-title">Check what you downloaded</h2>
      <p className="sideload-prose">
        Unlike an app, a userscript is readable: Tampermonkey shows you the whole file before you
        agree to install it, and nothing runs until you do. The checksum is here for anyone who
        would rather compare than read.
      </p>
      <code className="sideload-command">shasum -a 256 hwa-dungeon.user.js</code>
      <code className="sideload-hash">{manifest.sha256}</code>

      <p className="sideload-prose">
        It automates a game against that game&rsquo;s terms of service. Accounts get banned for this.
        Point it at one you would not mind losing.
      </p>
    </section>
  )
}

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1000)} KB`
}

function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
