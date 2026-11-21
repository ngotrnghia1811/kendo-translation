import Link from "next/link";
import { LINK_BAND_ACTION, LINK_BAND_BEFORE } from "@/lib/view-link";

// Unit VW120 (Q-A 3:106.5 row 5, owner note: "also add a note of the web page at top saying: this is a view only, please sign up ..."; Q-A 3:107.5 row 4):
// the band at the top of every page of a visitor of a view-only link. The words "Create an account" open /sign-up.
// The colors are fixed, so the band looks the same in the five themes (as the band of unit VW119): dark green text on light green, contrast above 7 to 1.
// A different color from the two bands of "View as" (amber and light blue), so nobody mistakes it for an admin view.
// It is a server component: no script, no key. The layout shows it only when the cookie of a live link is there and nobody is signed in.
export const LINK_BAND_COLORS = { background: "#b9e4a8", text: "#10290a" } as const;

export default function ViewLinkBand() {
  return (
    <div role="status" data-link-band className="px-6 py-2 text-sm font-semibold bg-[#b9e4a8] text-[#10290a]">
      {LINK_BAND_BEFORE}
      <Link href="/sign-up" className="underline" data-link-band-signup>
        {LINK_BAND_ACTION}
      </Link>
      .
    </div>
  );
}
