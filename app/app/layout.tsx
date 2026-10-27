import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "agent-translation-monitor",
  description: "Local monitor for the Translator runs. Round 44 answer 13.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 px-6 py-5">{children}</main>
      </body>
    </html>
  );
}
