import { getSession } from "@/lib/htv-session";
import { PbError } from "@/lib/pb";
import { LINK_DEAD_PATH, LINK_ROBOTS_HEADER, isLinkKey, linkCookieSeconds } from "@/lib/view-link";
import { clearLinkCookie, setLinkCookie } from "@/lib/view-link-cookie";
import { checkLinkKey, recordLinkOpen } from "@/lib/view-link-pb";

export const dynamic = "force-dynamic";

// The view-only link (unit VW120, plan item P58). Owner request (Q-A 3:105.8): "people with link can be a reader without sign-up, but all operation is only strictly view-only".
// GET /v/<key> (Q-A 3:107.5 row 1): the server checks the key with PocketBase, counts one open, saves the key in the cookie htv_link, and goes to /read.
//   - A person who is signed in stays signed in. The link does nothing for that person: no cookie, no open (row 5).
//   - A key that is off, ended, not known, or not a key goes to /link-ended and clears an old cookie (row 3).
//   - The key stays in this address only. The answer holds no key, the redirect holds no key, and nothing is logged here.
const HEADERS = { "X-Robots-Tag": LINK_ROBOTS_HEADER, "Cache-Control": "no-store" } as const;

const go = (location: string) => new Response(null, { status: 302, headers: { Location: location, ...HEADERS } });

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await ctx.params;
    if (await getSession()) return go("/read");
    if (!isLinkKey(key)) {
      await clearLinkCookie();
      return go(LINK_DEAD_PATH);
    }
    const state = await checkLinkKey(key);
    if (state === "down") return new Response("The sign-in server is not reachable. Start PocketBase and try again.", { status: 503, headers: HEADERS });
    if (state === "dead") {
      await clearLinkCookie();
      return go(LINK_DEAD_PATH);
    }
    await recordLinkOpen(key);
    // [unit default VW120] The key holder cannot read the end date (the list view_links is closed), so the cookie lives 30 days. The server checks the link at every page.
    await setLinkCookie(req, key, linkCookieSeconds(null, Date.now()));
    return go("/read");
  } catch (e) {
    if (e instanceof PbError && e.status === 503) return new Response(e.message, { status: 503, headers: HEADERS });
    return new Response("The link could not be opened.", { status: 500, headers: HEADERS });
  }
}
