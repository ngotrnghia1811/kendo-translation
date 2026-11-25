import Link from "next/link";
import VectorMapView from "@/components/VectorMapView";
import { requireMonitor } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { bookTitles } from "@/lib/books"; // unit VW130: the same title source as the Monitor pages
import { listPromptBooks, loadBoxMap, versionCounts } from "@/lib/vector-map-load";
import { BOX_TYPES, PAIRED_BOOK, bookLabel, bookOptions, isBoxType, resolveBook } from "@/lib/vector-map-rules";

export const dynamic = "force-dynamic";

// Unit VW106: the vector map of the prompt points, on the Monitor dashboard on this Mac only (Q-A 3:64.5 row 3).
// With the monitor off (the public site) the route shows the 404 page, as /monitor/phase-2 does (round 58 answer 7).
// This static route wins over /monitor/[slug] (Next.js sorts static segments before dynamic ones).
// Read only (Q-A 3:63.2 "Read-only map first"): no model call, no write.
// Unit VW130 (Q-A 3:133.2 rows 1 to 4): the address key `book` picks the book folder below book-store. No key, or paired-dataset, is the map of today.
// A book name that is not a safe folder name or has no prompt versions gives the map of the paired dataset and a note, never a 404 [unit default VW130].

const one = (v: string | string[] | undefined): string | null => (typeof v === "string" ? v : null);

export default async function VectorMapPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireMonitor();
  const q = await searchParams;
  const root = await dataRoot();
  const boxParam = one(q.box);
  const box = isBoxType(boxParam) ? boxParam : "QA_3";
  const books = await listPromptBooks(root);
  const { book, note } = resolveBook(one(q.book), books);
  const [map, counts, titles] = await Promise.all([
    loadBoxMap(root, box, book),
    versionCounts(root, BOX_TYPES, book),
    bookTitles(books.map((b) => b.slug)).catch(() => new Map<string, string>()),
  ]);
  return (
    <section>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Monitor dashboard
      </Link>
      <h1 data-vm-heading className="mt-2 mb-1 text-xl font-semibold">
        Vector map of the prompt points
      </h1>
      <p className="mb-3 max-w-3xl text-sm text-muted">
        One map for each box type. One dot for each numbered point of a stored prompt version. Across: comprehensiveness, how detailed the point is described in the prompt. Up:
        importance, how much the prompt emphasizes the point. Click a point to compare its start and end versions, open the whole prompt, or read its critique groups.
      </p>
      {book !== PAIRED_BOOK ? (
        <p data-vm-book-line className="mb-3 max-w-3xl text-sm">
          Book: <span className="font-semibold">{bookLabel(book, titles.get(book))}</span>. The map shows the prompt versions of this book. The Model score of a prompt version shows after the score script wrote its file.
        </p>
      ) : null}
      <VectorMapView
        map={map}
        counts={counts}
        state={{ box, version: one(q.v), axes: one(q.axes) === "model" ? "model" : "program", point: one(q.p), book }}
        books={{ options: bookOptions(books, titles), note }}
      />
    </section>
  );
}
