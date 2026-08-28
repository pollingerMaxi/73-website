export type Platform = 'browser' | 'android' | 'ios'

export type ReleaseStatus = 'available' | 'in-development' | 'planned'

export interface ExternalLink {
  readonly label: string
  readonly url: string
}

export interface AppEntry {
  readonly id: string
  readonly name: string
  readonly platform: Platform
  readonly status: ReleaseStatus
  readonly tagline: string
  readonly description: string
  readonly features: readonly string[]
  /**
   * What it deliberately does not do.
   *
   * Stated on the page rather than discovered after installing. An automation that refuses to act
   * on anything it cannot read will stop mid-run by design, and somebody who was not told that
   * reads a stop as a fault.
   */
  readonly limitations?: readonly string[]
  /** How to get it running, for anything that is not a single download. */
  readonly setup?: readonly SetupStep[]
  readonly download?: ExternalLink
  /**
   * Where to find the build manifest, for an app distributed as an APK from this site.
   *
   * Separate from `download`, which is a link to somewhere else. This one is a file the release
   * pipeline overwrites on every build, so the page can state the version, size and checksum
   * without any of them being written into the site by hand and going stale on the next release.
   */
  readonly sideload?: {
    readonly manifestUrl: string
    /**
     * What the app calls itself once installed, when that differs from its name here.
     *
     * It does differ, and deliberately: the APK carries a neutral name while this page says what
     * the thing actually is. Without stating it, somebody downloads one name and finds another on
     * their home screen, which is exactly the sort of small surprise that makes a sideloaded app
     * feel untrustworthy.
     */
    readonly installsAs?: string
  }
}

export interface SetupStep {
  readonly title: string
  readonly detail: string
  readonly link?: ExternalLink
}

export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  browser: 'Browser',
  android: 'Android',
  ios: 'iOS',
}

export const STATUS_LABELS: Readonly<Record<ReleaseStatus, string>> = {
  available: 'Available',
  'in-development': 'In development',
  planned: 'Planned',
}

const APP_CATALOG: readonly AppEntry[] = [
  {
    id: 'hwa-dungeon-browser',
    name: 'HWA dungeon automation for the browser',
    platform: 'browser',
    status: 'available',
    tagline: 'Plays the guild dungeon in the browser build, from inside the page.',
    description:
      'A userscript that plays the Hero Wars: Alliance guild dungeon in your own browser. The game paints everything into one canvas, so there are no buttons to press from the outside: it reads the pixels the game draws, works out which screen is showing, clicks, and repeats. Anything it does not recognise stops the run rather than clicking and hoping.',
    features: [
      'Picks the room by element, in an order you rank yourself: water, earth, mix and fire',
      'Keeps the healing slot filled — swaps the hurt tank in on mixed floors and back out once it has healed',
      'Refuses to fight with fewer than five titans, because an understrength fight costs the whole day rather than the battle',
      'Activates save points and collects the reward',
      'Tells a win from a loss and keeps the tally honest',
      'Runs at any window size, and stops rather than guessing on any screen it cannot read',
    ],
    limitations: [
      'It does not find its own way to the dungeon. Open Guild → Dungeon yourself, then press Run.',
      'It does not build a team. It only ever swaps the one healing slot, so field a full team first.',
      'The tab has to stay visible. Chrome stops drawing hidden tabs, and the script reads what the game draws — it pauses while the tab is in the background and carries on when it comes back. A separate window is fine; minimised or fully covered is not.',
      'It never buys anything, spends gems, or touches your account settings. It clicks the dungeon, and nothing else.',
      'It plays the browser build only. For the phone, use the Android app.',
    ],
    setup: [
      {
        title: 'Install Tampermonkey',
        detail:
          'A userscript manager for your browser. It is what runs the script on the game page — the script is only a file, and Tampermonkey is what loads it.',
        link: { label: 'tampermonkey.net', url: 'https://www.tampermonkey.net/' },
      },
      {
        title: 'Turn on Allow User Scripts',
        detail:
          'Chrome only lets extensions run userscripts once this is on. Open chrome://extensions, click Details on Tampermonkey, and enable "Allow User Scripts". Without it the script installs, shows as enabled, and silently never runs — this catches everybody once. Firefox needs nothing.',
        link: { label: 'Tampermonkey FAQ Q209', url: 'https://www.tampermonkey.net/faq.php?q=Q209' },
      },
      {
        title: 'Install the script',
        detail:
          'Open the download link below. Tampermonkey recognises it and offers to install — click Install, then reload the game.',
      },
      {
        title: 'Open the dungeon and press Run',
        detail:
          'Go to Guild → Dungeon yourself and field a full team. A small panel sits at the top left of the game with Run, Stop, and the room order. Drag the order into whatever suits your roster; it is remembered.',
      },
    ],
    download: {
      label: 'Download the userscript',
      url: 'https://seventhree.dev/downloads/hwa-dungeon.user.js',
    },
  },
  {
    id: 'hwa-dungeon-android',
    name: 'HWA dungeon & brawl automation',
    platform: 'android',
    status: 'available',
    tagline: 'Plays the daily grind in Hero Wars: Alliance while you do something else.',
    description:
      'An Android app that plays two things for you: the guild dungeon, and the brawl events that come round every few weeks. It works by reading the screen, so it screenshots, works out which screen is showing, taps, and repeats. Anything it does not recognise stops the run, rather than tapping and hoping.',
    features: [
      'Guild dungeon: picks the battle, swaps the damaged tank in, collects the rewards',
      'Brawls: attacks the weaker of the two opponents every time, and skips the fight',
      'Stops rather than guessing on any screen it cannot read',
      'Keeps a log of every decision and every tap, so a run can be explained afterwards',
      'A floating panel to start and stop it, over the game',
    ],
    sideload: { manifestUrl: '/downloads/latest.json', installsAs: 'HWA automation' },
  },
  {
    id: 'hwa-dungeon-ios',
    name: 'HWA Dungeon Automation for iOS',
    platform: 'ios',
    status: 'planned',
    tagline: 'Coming after the Android release.',
    description:
      'The iOS version of the dungeon automation. Planned once the Android app is stable and the automation engine is shared across platforms.',
    features: [
      'Feature parity with the Android app',
      'iPhone and iPad support',
    ],
  },
]

export function listApps(): readonly AppEntry[] {
  return APP_CATALOG
}

/**
 * Ids this site used to publish, and what they are called now.
 *
 * Renaming an app changes a URL that is already out in the world, so the old id keeps resolving
 * rather than turning into a dead link. Entries here are permanent: the whole point is that a link
 * shared once keeps working.
 */
const RENAMED_APP_IDS: Readonly<Record<string, string>> = {
  'hwa-dungeon-chrome': 'hwa-dungeon-browser',
}

export interface AppIdRedirect {
  readonly from: string
  readonly to: string
}

export function listAppIdRedirects(): readonly AppIdRedirect[] {
  return Object.entries(RENAMED_APP_IDS).map(([from, to]) => ({ from, to }))
}

export function findAppById(id: string | undefined): AppEntry | undefined {
  return APP_CATALOG.find((app) => app.id === id)
}
