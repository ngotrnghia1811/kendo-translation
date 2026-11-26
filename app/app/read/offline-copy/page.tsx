import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OfflineReader from "@/components/OfflineReader";
import { getSession, READER_SIGN_IN_PATH } from "@/lib/htv-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Offline copy" };

// The shell page of the offline copy (unit VW131, Q-A 3:134.3 row 3). A save stores the HTML of this page in the cache kendo-offline-shell-v1.
// With no network, the service worker (public/offline-sw.js) answers /read/<book>?view=..&at=.. with that HTML. The address in the browser stays.
// The client component OfflineReader reads the address and the saved copy, and draws the same Reader screen (ReaderBar and ReaderBook).
// The page itself holds no text of a book. It answers only a signed-in person, because only such a person can save a copy.
export default async function OfflineCopyShell() {
  const s = await getSession();
  if (!s) redirect(READER_SIGN_IN_PATH);
  return <OfflineReader />;
}
