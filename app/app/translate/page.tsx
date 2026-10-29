import HtvBar from "@/components/HtvBar";
import HtvList from "@/components/HtvList";
import { listFinishedPages } from "@/lib/htv-runs";
import { requireSession } from "@/lib/htv-session";
import { PbError, runMarks } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Human-translation-view, list of pages. Round 51 answer 13 (Q-A 2026-10-28 l58): all finished pages, FAIL pages included.
// Round 54 answer 9 (l128): sign-in on this view only.
export default async function TranslateList() {
  const s = await requireSession("/translate");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  let marks = new Map<string, string>();
  let note = "";
  try {
    marks = await runMarks(s.token);
  } catch (e) {
    if (!(e instanceof PbError)) throw e;
    note = "The run marks could not be read: " + e.message + " The list shows the newest finished runs.";
  }
  const rows = await listFinishedPages(marks, s.token);
  return (
    <>
      <HtvBar name={s.user.name} email={s.user.email} role={s.user.role} />
      {note ? <p className="mb-2 text-sm text-red-700">{note}</p> : null}
      <HtvList rows={rows} />
    </>
  );
}
