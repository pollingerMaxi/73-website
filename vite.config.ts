import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { BUILD_MANIFEST_FILE, type BuildManifest } from './src/domain/buildManifest.ts'

/**
 * Identifies this build. Only has to differ from the previous one, which a build timestamp does.
 */
const BUILD_ID = Date.now().toString(36)

/**
 * Publishes the build's id beside the site, so a page can compare it with the id it was built with
 * and notice it is running from a cached `index.html`. See `src/domain/buildVersion.ts`.
 */
function publishBuildId(): Plugin {
  return {
    name: 'publish-build-id',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: BUILD_MANIFEST_FILE,
        source: JSON.stringify({ buildId: BUILD_ID } satisfies BuildManifest),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publishBuildId()],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
  },
})
