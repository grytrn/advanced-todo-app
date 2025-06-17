import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry(): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      integrations: [
        new BrowserTracing({
          // Set sampling rates
          tracingOrigins: [
            'localhost',
            /^https:\/\/todo-app\.vercel\.app/,
            /^https:\/\/todo-backend\.onrender\.com/,
          ],
          // Performance monitoring
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
        new Sentry.Replay({
          // Capture 10% of all sessions
          sessionSampleRate: 0.1,
          // Capture 100% of sessions with an error
          errorSampleRate: 1.0,
          // Mask sensitive content
          maskAllText: false,
          maskAllInputs: true,
          blockAllMedia: false,
        }),
      ],
      // Performance monitoring
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION,
      // Only send errors in production
      enabled: import.meta.env.MODE === 'production',
      // Filter out expected errors
      beforeSend(event, hint) {
        // Filter out network errors
        if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
          return null;
        }
        
        // Filter out canceled requests
        if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
          return null;
        }
        
        // Don't send events from browser extensions
        if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('extension://')
        )) {
          return null;
        }
        
        return event;
      },
      // User context
      initialScope: {
        tags: {
          component: 'frontend',
        },
      },
    });

    console.log('✅ Sentry initialized');
  } else {
    console.log('⚠️  Sentry DSN not provided, error tracking disabled');
  }
}

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Performance profiler
export const SentryProfiler = Sentry.Profiler;

// Capture exception helper
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  } else {
    console.error('Error captured:', error, context);
  }
};

// Set user context
export const setUser = (user: { id: string; email: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};