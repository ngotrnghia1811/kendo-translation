import BooksView from "@/components/BooksView";
import { listBooks } from "@/lib/books";
import { requireMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 43 answer 6 (Q-A l110): Books is the second tab.
// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, the page gives "not found".
export default async function BooksPage() {
  await requireMonitor();
  return <BooksView rows={await listBooks()} />;
}
