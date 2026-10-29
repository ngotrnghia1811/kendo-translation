import ReaderBar from "@/components/ReaderBar";
import ReaderList from "@/components/ReaderList";
import { requireReaderSession } from "@/lib/htv-session";
import { loadBookCards } from "@/lib/reader-data";
import { WAITING } from "@/lib/reader-types";

export const dynamic = "force-dynamic";

// Reader pages, book list (unit RC1, round 63 answers 4 and 9). Any signed-in person sees the 37 cards.
// A reader who waits for approval sees the cards and the line "Your account waits for approval by an admin." The page text stays closed (rules of PocketBase).
export default async function ReadList() {
  const s = await requireReaderSession("/read");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const cards = await loadBookCards(s.token, s.user);
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      {!s.user.approved ? (
        <p role="status" className="mb-4 rounded border border-line bg-white p-3 text-sm" data-waiting>
          {WAITING}
        </p>
      ) : null}
      <h1 className="mb-4 text-2xl font-semibold">Books</h1>
      <ReaderList cards={cards} approved={s.user.approved} />
    </>
  );
}
