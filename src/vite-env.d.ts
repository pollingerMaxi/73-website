/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Stamped in by `vite.config.ts`; identifies the build a loaded page came from. */
  readonly VITE_BUILD_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
