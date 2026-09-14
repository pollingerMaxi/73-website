import { useEffect } from 'react'
import { fetchDeployedBuildId, readRunningBuildId } from '../domain/buildVersion'

/**
 * Remembers, for this tab only, which build it has already reloaded itself for.
 *
 * The reload is a bet that a normal reload revalidates `index.html` and picks up the new build. If
 * that bet ever loses — a proxy serving the stale page regardless, a browser deciding not to
 * revalidate — an unguarded check would find the same mismatch again and reload forever. One
 * attempt per deployed build is the whole safety margin, so if the attempt cannot be recorded it is
 * not made.
 */
const RELOADED_BUILD_KEY = 'seventhree.reloaded-build'

/**
 * Reloads the page once when it is running a build that is no longer the deployed one.
 *
 * Checked on load, and again whenever the tab comes back to the foreground, which is when a page
 * left open for days is most likely to be read again. The site holds no unsaved state, so a reload
 * costs the visitor nothing beyond their scroll position.
 */
export function useReloadOnNewBuild(): void {
  useEffect(() => {
    let cancelled = false

    async function reloadIfBuildIsStale(): Promise<void> {
      const deployedBuildId = await fetchDeployedBuildId()

      if (cancelled) return
      if (deployedBuildId === null) return
      if (deployedBuildId === readRunningBuildId()) return
      if (hasAlreadyReloadedFor(deployedBuildId)) return
      if (!rememberReloadFor(deployedBuildId)) return

      window.location.reload()
    }

    function checkWhenTabBecomesVisible(): void {
      if (document.visibilityState === 'visible') void reloadIfBuildIsStale()
    }

    void reloadIfBuildIsStale()
    document.addEventListener('visibilitychange', checkWhenTabBecomesVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', checkWhenTabBecomesVisible)
    }
  }, [])
}

function hasAlreadyReloadedFor(buildId: string): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED_BUILD_KEY) === buildId
  } catch {
    // Storage can be denied outright, and a check that cannot remember must not reload.
    return true
  }
}

/** Returns whether the attempt could be recorded, which is the condition for making it. */
function rememberReloadFor(buildId: string): boolean {
  try {
    window.sessionStorage.setItem(RELOADED_BUILD_KEY, buildId)
    return true
  } catch {
    return false
  }
}
