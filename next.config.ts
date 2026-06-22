import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
};

export default withSentryConfig(nextConfig, {
  org: 'nghia-ngo',
  project: 'kendo-translation',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
