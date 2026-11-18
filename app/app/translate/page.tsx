import HtvBar from "@/components/HtvBar";
import ReaderList from "@/components/ReaderList";
import { SearchBox } from "@/components/ReaderSearch";
import TranslateSearch, { TRANSLATE_SEARCH_HINT } from "@/components/TranslateSearch";
import { requireStaff } from "@/lib/htv-session";
import { PbError, runMarks } from "@/lib/pb";
import { lazyMonths, withTocRows } from "@/lib/reader-folds";
import { agentFoldLine } from "@/lib/translate-dash";
import { loadTranslateDashboard, translateTocRows } from "@/lib/translate-dash-load";
import { Pane, PaneCog, PaneSettingsProvider } from "@/components/PaneSettings";
import { loadPaneSettings, readTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/** The month that /translate?open=kj-2014-10 draws on the server: the link "Show this month" for a browser without script. */
const OPEN_RULE = /^(kj|web)-(\d{4}|unknown)-\d{2}$/;

// Unit RC1 (round 63 answer 4): a reader goes to /read (requireStaff). Round 54 answer 9 (l128): sign-in on this view only.
// Unit VW112 (round 98, plan P47). Owner words (Q-A 3:76.5 note): "The /translate should have the same dashboard view as /read".
// Owner pick Q-A 3:78.4 "Rows 1-7 as written": the fold tree of /read (Books, Kendo Jidai by year and month), the same hidden folders,
// a search box, and rows that open /translate/<book>. Each row shows the metadata, the agent translation count, and the Monitor facts (files mode).
//   /translate              the folds; the first level is open
//   /translate?q=seme       the works whose title or metadata holds the query
//   /translate?open=kj-2014-10   the folds with that month drawn on the server
//   /translate?open=toc-<slug>   the folds with the table of contents of that book drawn on the server (fix round, Q-A 3:80.3, as /read unit VW77e)
export default async function TranslateList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const s = await requireStaff("/translate");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  let marks = new Map<string, string>();
  let note = "";
  try {
    marks = await runMarks(s.token);
  } catch (e) {
    if (!(e instanceof PbError)) throw e;
    note = "The run marks could not be read: " + e.message + " The list shows the newest finished runs.";
  }
  const td = await loadTranslateDashboard(s.token, marks, first(q.q));
  const { dash: full, search, monitorNote } = td;
  const openRaw = first(q.open);
  let openId = OPEN_RULE.test(openRaw) ? openRaw : "";
  let folds = full.folds;
  // Fix round (Q-A 3:80.3): the link "Show the table of contents" for a browser without script. Only a book with a ToC fold opens. A failed read leaves the fold closed.
  if (openRaw.startsWith("toc-")) {
    try {
      const rows = await translateTocRows(s.token, td, openRaw);
      if (rows) {
        folds = withTocRows(folds, openRaw, rows);
        openId = openRaw;
      }
    } catch {
      openId = "";
    }
  }
  const dash = { ...full, folds: lazyMonths(folds, openId) };
  const t = dash.totals;
  const panes = await loadPaneSettings(s.token, s.user.id);
  return (
    <PaneSettingsProvider initial={panes} theme={await readTheme()}>
      <HtvBar name={s.user.name} email={s.user.email} role={s.user.role} />
      {note ? <p className="mb-2 text-sm text-red-700">{note}</p> : null}
      {/* Round 61 answer 5 (l265): the list keeps one cog in its own header. The heading stays as in the old flat list (components/HtvList.tsx). */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Books for human translation</h1>
        <PaneCog id="list" />
      </div>
      <SearchBox query={search?.query ?? ""} action="/translate" hint={TRANSLATE_SEARCH_HINT} />
      <Pane id="list">
        {search ? (
          <TranslateSearch search={search} />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted" data-dashboard-total>
              {t.works.toLocaleString("en-US")} works, {t.pages.toLocaleString("en-US")} pages. {agentFoldLine(t.translated, t.pages)}.
            </p>
            {monitorNote ? (
              <p className="mb-3 text-sm text-muted" data-monitor-note>
                {monitorNote}
              </p>
            ) : null}
            <ReaderList dash={dash} approved openId={openId} to="translate" />
          </>
        )}
      </Pane>
    </PaneSettingsProvider>
  );
}
