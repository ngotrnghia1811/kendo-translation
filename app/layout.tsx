import type { Metadata } from 'next';
import './globals.css';
import { SiteNav } from '@/components/shared/SiteNav';

export const metadata: Metadata = {
  title: 'Kendo Translation | Collaborative Japanese-English Platform',
  description: 'Collaborative translation platform for Japanese kendo content featuring MAC-RAG AI assistance and real-time editing.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
