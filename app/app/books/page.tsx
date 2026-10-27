import BooksView from "@/components/BooksView";
import { listBooks } from "@/lib/books";

export const dynamic = "force-dynamic";

// Round 43 answer 6 (Q-A l110): Books is the second tab.
export default async function BooksPage() {
  return <BooksView rows={await listBooks()} />;
}
