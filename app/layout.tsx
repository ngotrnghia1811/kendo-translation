import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteNav } from '@/components/shared/SiteNav';
import { ThemeProvider } from '@/components/shared/ThemeProvider';

export const metadata: Metadata = {
  title: 'Kendo Translation | Collaborative Japanese-English Platform',
  description: 'Collaborative translation platform for Japanese kendo content featuring MAC-RAG AI assistance and real-time editing.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <SiteNav />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
