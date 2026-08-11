import { redirect } from 'next/navigation';

/**
 * /documents — fully replaced by /books per docs/BOOK_HIERARCHY_UI_PLAN.md §1.
 * All traffic is redirected to the new book hierarchy browse entry point.
 * Phase 3 cutover.
 */
export default function DocumentsPage() {
  redirect('/books');
}
