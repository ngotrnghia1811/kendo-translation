import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kendo Translation | Collaborative Japanese-English Platform',
  description: 'Collaborative translation platform for Japanese kendo content featuring MAC-RAG AI assistance and real-time editing.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
