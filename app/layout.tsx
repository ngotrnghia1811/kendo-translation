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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <SiteNav />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
