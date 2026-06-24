import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteNav } from '@/components/shared/SiteNav';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { AuthProvider } from '@/components/shared/AuthProvider';
import { PwaRegistration } from '@/components/shared/PwaRegistration';

export const metadata: Metadata = {
  title: 'Kendo Translation | Collaborative Japanese-English Platform',
  description: 'Collaborative translation platform for Japanese kendo content featuring MAC-RAG AI assistance and real-time editing.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kendo TL',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e3a5f' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1f33' },
  ],
};

/** Inline script that sets `data-theme` on <html> before first paint to
 *  eliminate flash-of-unstyled-content when dark mode is active.
 *  Reads localStorage key `kt-theme` (app-level), falls back to
 *  `prefers-color-scheme`.  Does NOT touch `reader-theme-settings` —
 *  the reader theme provider owns that key independently. */
const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('kt-theme');
    var theme = stored;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
})();
`.replace(/\n/g, '');

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <ThemeProvider>
            <SiteNav />
            <main>{children}</main>
          </ThemeProvider>
        </AuthProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
