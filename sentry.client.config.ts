import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const isSlowConnection =
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((navigator as any).connection?.saveData || ['slow-2g', '2g'].includes((navigator as any).connection?.effectiveType));

  Sentry.init({
    dsn,
    tracesSampleRate: isSlowConnection ? 0 : (process.env.NODE_ENV === 'development' ? 0.2 : 0.01),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: isSlowConnection ? 0 : 0.5,
    enableLogs: false,
    integrations: isSlowConnection ? [] : [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
