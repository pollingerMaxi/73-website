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
    name: 'HWA Dungeon Automation for Android',
    platform: 'android',
    status: 'planned',
    tagline: 'The same dungeon automation, on your phone.',
    description:
      'An Android app that brings the dungeon automation to mobile, so you can clear the daily run without opening a browser.',
    features: [
      'Same automation engine as the Chrome extension',
      'Background runs with a progress notification',
      'Presets synchronised across your devices',
    ],
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
