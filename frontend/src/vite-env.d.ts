/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_OAUTH: string
  readonly VITE_ENABLE_2FA: string
  readonly VITE_ENABLE_OFFLINE: string
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GA_TRACKING_ID: string
  readonly VITE_POSTHOG_KEY: string
  readonly VITE_POSTHOG_HOST: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GITHUB_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}