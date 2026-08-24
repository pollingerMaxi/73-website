export type Platform = 'chrome' | 'android' | 'ios'

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
  readonly download?: ExternalLink
  /**
   * Where to find the build manifest, for an app distributed as an APK from this site.
   *
   * Separate from `download`, which is a link to somewhere else. This one is a file the release
   * pipeline overwrites on every build, so the page can state the version, size and checksum
   * without any of them being written into the site by hand and going stale on the next release.
   */
  readonly sideload?: { readonly manifestUrl: string }
}

export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  chrome: 'Chrome Extension',
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
    id: 'hwa-dungeon-chrome',
    name: 'HWA Dungeon Automation',
    platform: 'chrome',
    status: 'in-development',
    tagline: 'Run your daily dungeon from the browser, hands free.',
    description:
      'A Chrome extension that automates the Hero Wars Alliance dungeon run: it picks the path, sends the right teams and collects the rewards while you do something else.',
    features: [
      'Automatic path selection based on your roster',
      'Team presets per dungeon floor',
      'Run summary with rewards obtained',
      'Pause and take over manually at any point',
    ],
  },
  {
    id: 'hwa-dungeon-android',
    name: '73 automation',
    platform: 'android',
    status: 'available',
    tagline: 'Plays the daily grind in Hero Wars: Alliance while you do something else.',
    description:
      'An Android app that plays two things for you: the guild dungeon, and the brawl events that come round every few weeks. It works by reading the screen — the game is one canvas with no buttons to press programmatically — so it screenshots, works out which screen is showing, taps, and repeats. Anything it does not recognise stops the run and keeps the frame, rather than tapping and hoping.',
    features: [
      'Guild dungeon: picks the battle, swaps the damaged tank in, collects the rewards',
      'Brawls: attacks the weaker of the two opponents every time, and skips the fight',
      'Stops rather than guessing on any screen it cannot read',
      'Keeps a log of every decision and every tap, so a run can be explained afterwards',
      'A floating panel to start and stop it, over the game',
    ],
    sideload: { manifestUrl: '/downloads/latest.json' },
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

export function findAppById(id: string | undefined): AppEntry | undefined {
  return APP_CATALOG.find((app) => app.id === id)
}
