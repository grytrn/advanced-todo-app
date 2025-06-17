import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        // Automatic instrumentation
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: true }),
        // Performance profiling
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Release tracking
      release: process.env.npm_package_version,
      // Filter out expected errors
      beforeSend(event, hint) {
        // Filter out 404s
        if (event.exception?.values?.[0]?.value?.includes('404')) {
          return null;
        }
        
        // Filter out validation errors in production
        if (
          process.env.NODE_ENV === 'production' &&
          event.exception?.values?.[0]?.type === 'ValidationError'
        ) {
          return null;
        }
        
        return event;
      },
      // User privacy
      beforeSendTransaction(event) {
        // Remove sensitive data from URLs
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/\/users\/\d+/, '/users/[id]');
        }
        return event;
      },
    });

    console.log('✅ Sentry initialized');
  } else {
    console.log('⚠️  Sentry DSN not provided, error tracking disabled');
  }
}

// Error handler middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors in production
    if (process.env.NODE_ENV === 'production') {
      return true;
    }
    // In development, only capture 5xx errors
    return error.status >= 500;
  },
});

// Request handler middleware
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  user: ['id', 'email'],
  ip: false, // Don't capture IP addresses for privacy
});

// Tracing middleware
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();