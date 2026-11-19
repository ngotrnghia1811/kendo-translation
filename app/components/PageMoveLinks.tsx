"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markNavigating } from "@/lib/loading-rule";
import { NEXT_TITLE, PREVIOUS_TITLE, pageKeyDirection } from "@/lib/page-move";

// Unit VW115 (Q-A 3:93.5, accepted design row 3 in Q-A 3:94.2), owner words: "Also I want to be able to go to prev/next book page."
// Accepted design: "'Previous page' and 'Next page' links at the top, and the Left and Right arrow keys, as on /read. The link opens the page with its newest run,
// because each page has its own run name in ?run=."
// The server (lib/page-neighbors.ts) gives the two addresses. A page at the end of the book, or a book with no run on the other side, gives null.
// [unit default VW115] A null address shows a grayed link that does nothing, so the place of the other link does not jump.
// The arrow key rules are the ones of the Reader dashboard page view (unit RC5), now in lib/page-move.ts.

const LINK = "rounded border border-line px-2 py-1 text-sm";
// Grayed: muted text, a dashed edge. No opacity, so the text keeps a contrast of 4.5 to 1 or more in every theme.
const GRAYED = "rounded border border-dashed border-line px-2 py-1 text-sm text-muted";

export default function PageMoveLinks({ previous, next }: { previous: string | null; next: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The stage tabs of the Monitor page view are plain buttons that do not use the arrow keys, so the keys work while a tab has the focus.
      const direction = pageKeyDirection(e, false);
      if (!direction) return;
      const to = direction === "previous" ? previous : next;
      if (!to) return;
      e.preventDefault();
      markNavigating();
      router.push(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previous, next, router]);

  return (
    <nav aria-label="Move to another page" className="flex items-center gap-2" data-page-move>
      {previous ? (
        <Link href={previous} title={PREVIOUS_TITLE} data-page-prev className={LINK}>
          ‹ Previous page
        </Link>
      ) : (
        <span aria-disabled="true" title="This is the first page with a run" data-page-prev data-page-move-off className={GRAYED}>
          ‹ Previous page
        </span>
      )}
      {next ? (
        <Link href={next} title={NEXT_TITLE} data-page-next className={LINK}>
          Next page ›
        </Link>
      ) : (
        <span aria-disabled="true" title="This is the last page with a run" data-page-next data-page-move-off className={GRAYED}>
          Next page ›
        </span>
      )}
    </nav>
  );
}
