import type { Platform } from '../domain/appCatalog'

const PLATFORM_GLYPHS: Readonly<Record<Platform, string>> = {
  chrome: '◎',
  android: '▲',
  ios: '◆',
}

interface PlatformIconProps {
  platform: Platform
}

export function PlatformIcon({ platform }: PlatformIconProps) {
  return (
    <span className="platform-icon" aria-hidden="true">
      {PLATFORM_GLYPHS[platform]}
    </span>
  )
}
