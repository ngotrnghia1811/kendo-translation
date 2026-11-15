import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { monitorEnabled } from "@/lib/monitor";
import { readTheme } from "@/lib/theme";

// Unit VW105 (Q-A 3:60.3, finding 1 of DEPLOYCHECK): with the monitor off (the public site) the title of this layout shows only on the 404 page of a monitor path,
// for example /runs, because every other page has its own title. That title must not say "agent-translation-monitor" there. With the monitor on (this Mac) it stays as before.
export async function generateMetadata(): Promise<Metadata> {
  if (await monitorEnabled()) return { title: "agent-translation-monitor", description: "Local monitor for the Translator runs. Round 44 answer 13." };
  return { title: "Kendo books", description: "Japanese kendo books and magazines in English, next to the Japanese text." };
}

// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, the tabs of the agent-translation-monitor disappear.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const monitor = await monitorEnabled();
  // Round 58 answer 6 (Q-A l204): the cookie "theme" sets data-theme on <html> at the server, so the first paint has no jump.
  const theme = await readTheme();
  return (
    <html lang="en" className="h-full antialiased" data-theme={theme}>
      <body className="min-h-full flex flex-col">
        <Nav monitor={monitor} theme={theme} />
        <main className="flex-1 px-6 py-5">{children}</main>
      </body>
    </html>
  );
}
