import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { useAuthStore } from '../store'

export function useSentry() {
  const { user } = useAuthStore()

  useEffect(() => {
    // Initialize Sentry only in production
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        // Basic configuration without advanced integrations
        tracesSampleRate: 0.1, // 10% of transactions
      })
    }
  }, [])

  useEffect(() => {
    // Set user context when authenticated
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      })
    } else {
      Sentry.setUser(null)
    }
  }, [user])
}