import HtvBar from "@/components/HtvBar";
import HtvList from "@/components/HtvList";
import { listBookRows } from "@/lib/htv-books";
import { requireSession } from "@/lib/htv-session";
import { PbError, runMarks } from "@/lib/pb";
import { PaneSettingsProvider } from "@/components/PaneSettings";
import { loadPaneSettings, readTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Human-translation-view, list of books. Round 59 answer 4 (Q-A 2026-10-28 l222): the list shows the books that have a finished run.
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
  const rows = await listBookRows(marks, s.token);
  const panes = await loadPaneSettings(s.token, s.user.id);
  return (
    <PaneSettingsProvider initial={panes} theme={await readTheme()}>
      <HtvBar name={s.user.name} email={s.user.email} role={s.user.role} />
      {note ? <p className="mb-2 text-sm text-red-700">{note}</p> : null}
      <HtvList rows={rows} />
    </PaneSettingsProvider>
  );
}
