import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { monitorEnabled } from "@/lib/monitor";

export const metadata: Metadata = {
  title: "agent-translation-monitor",
  description: "Local monitor for the Translator runs. Round 44 answer 13.",
};

// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, the tabs of the agent-translation-monitor disappear.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const monitor = await monitorEnabled();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav monitor={monitor} />
        <main className="flex-1 px-6 py-5">{children}</main>
      </body>
    </html>
  );
}
