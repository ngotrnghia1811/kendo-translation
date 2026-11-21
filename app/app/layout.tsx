import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import NavigationLoading from "@/components/NavigationLoading";
import ViewAsBand from "@/components/ViewAsBand";
import ViewLinkBand from "@/components/ViewLinkBand";
import { ViewAsProvider } from "@/components/ViewAsProvider";
import VisualIssueTool from "@/components/VisualIssueTool";
import { monitorEnabled } from "@/lib/monitor";
import { readTheme } from "@/lib/theme";
import { viewInfo } from "@/lib/view-as-server";
import { linkInfo } from "@/lib/view-link-server";
import { LINK_ROBOTS } from "@/lib/view-link";
import { canReportIssues } from "@/lib/visual-issues";

// Unit VW105 (Q-A 3:60.3, finding 1 of DEPLOYCHECK): with the monitor off (the public site) the title of this layout shows only on the 404 page of a monitor path,
// for example /runs, because every other page has its own title. That title must not say "agent-translation-monitor" there. With the monitor on (this Mac) it stays as before.
// Unit VW120 (Q-A 3:107.5 row 7): the pages of a visitor of a view-only link tell search engines not to list them (robots noindex, nofollow). Other visitors get no robots line.
export async function generateMetadata(): Promise<Metadata> {
  const robots = (await linkInfo()).link ? LINK_ROBOTS : undefined;
  if (await monitorEnabled()) return { title: "agent-translation-monitor", description: "Local monitor for the Translator runs. Round 44 answer 13.", robots };
  return { title: "Kendo books", description: "Japanese kendo books and magazines in English, next to the Japanese text.", robots };
}

// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, the tabs of the agent-translation-monitor disappear.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const monitor = await monitorEnabled();
  // Round 58 answer 6 (Q-A l204): the cookie "theme" sets data-theme on <html> at the server, so the first paint has no jump.
  const theme = await readTheme();
  // Unit VW118 (Q-A 3:99.5 row 1): the icon of the visual-issue tool shows for a signed-in translator or admin only, on every screen. The client part gets no token and no user (a flag and the theme).
  // Unit VW119 (Q-A 3:103.5 rows 1 to 3): the two flags for the select "View as" and the band. The call starts first and runs next to the one above (no extra wait).
  const viewPending = viewInfo();
  // Unit VW120 (Q-A 3:107.5 rows 4 and 5): the band of a link visitor shows only for a live link and no signed-in person. A fault hides the band and breaks nothing.
  const linkPending = linkInfo();
  const reporter = await canReportIssues();
  const { admin, view } = await viewPending;
  const { link } = await linkPending;
  return (
    <html lang="en" className="h-full antialiased" data-theme={theme}>
      <body className="min-h-full flex flex-col">
        <ViewAsProvider admin={admin} view={view} monitor={monitor}>
          {/* Unit VW119 (Q-A 3:103.5 row 3): the colored band of a view, above the top band of the site. */}
          <ViewAsBand />
          {/* Unit VW120 (Q-A 3:106.5 row 5): the band of a view-only link, above the top band. */}
          {link ? <ViewLinkBand /> : null}
          <Nav monitor={monitor} theme={theme} />
          <main className="flex-1 px-6 py-5">{children}</main>
        </ViewAsProvider>
        {/* Unit VW115 (Q-A 3:94.2 row 6): the Loading pop-up for a page change on every screen. */}
        <NavigationLoading />
        {/* Unit VW118 (Q-A 3:98.5, 3:99.5): the visual-issue tool (a small round icon at the bottom right corner). */}
        {reporter ? <VisualIssueTool theme={theme} /> : null}
      </body>
    </html>
  );
}
