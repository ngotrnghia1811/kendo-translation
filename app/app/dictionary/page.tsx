import Link from "next/link";
import DictEntryDetail from "@/components/DictEntryDetail";
import DictionaryPanel from "@/components/DictionaryPanel";
import ProposalsPanel from "@/components/ProposalsPanel";
import ProposalsTabLabel from "@/components/ProposalsTabLabel";
import ReaderBar from "@/components/ReaderBar";
import { DICT_WORDS, dictHref, parseDictParams, PROPOSALS_TAB } from "@/lib/dictionary-core";
import { loadDictionaryEntry, loadDictionaryList } from "@/lib/dictionary-data";
import { monitorEnabled } from "@/lib/monitor";
import { ProposalProblem } from "@/lib/proposals-core";
import { openTermCount } from "@/lib/proposal-terms-data";
import { loadProposalsView, type ProposalsView } from "@/lib/proposals-data";
import { WAITING } from "@/lib/reader-types";
import { requireReaderOrLink } from "@/lib/view-link-server";

export const dynamic = "force-dynamic";

// Dictionary page (unit VW126; Q-A 3:116.8 "We will have a kendo dict web page (for all roles) with a agent-proposal tab (not for reader)", Q-A 3:117.6 rows 1 to 4, Q-A 3:117.7 rows 1 and 2).
//   /dictionary                    the list of all entries, 25 on a screen, in the order of the readings, and the search box
//   /dictionary?q=kote&screen=2    the entries that hold the words (Japanese, kana, romaji with or without macrons, English)
//   /dictionary?entry=c-00a61202322b   the full entry
//   /dictionary?tab=proposals      the tab "Agent proposals": for a translator or an admin, and only on this Mac (the Monitor switch is on). Nobody else gets the tab.
// Who sees what is the gate of /read: an approved reader, a translator, an admin, and a visitor of a view-only link read the dictionary. A reader who waits for approval sees the banner and no entry.
export default async function DictionaryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseDictParams(await searchParams);
  const s = await requireReaderOrLink("/dictionary");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const linkVisitor = s.link === true;
  // The tab for the agent proposals: a translator or an admin (the role of the view when an admin uses "View as"), never a link visitor, and only when the Monitor switch is on.
  const proposalsOn = !linkVisitor && s.user.role !== "reader" && (await monitorEnabled());
  const onProposals = proposalsOn && p.tab === PROPOSALS_TAB;

  let body: React.ReactNode = null;
  // Unit VW129 (Q-A 3:129.4 row 1): the number of open terms for the button "Agent proposals (N open)". Null: no count (the termbase folder is not set or a file is missing).
  let openCount: number | null = null;
  if (proposalsOn && s.user.approved && !onProposals) openCount = await openTermCount();
  if (!s.user.approved) {
    body = null;
  } else if (onProposals) {
    let view: ProposalsView | null = null;
    let error = "";
    try {
      view = await loadProposalsView();
    } catch (e) {
      if (!(e instanceof ProposalProblem)) throw e;
      error = e.message;
    }
    openCount = view ? view.counts.open : null;
    body = <ProposalsPanel role={s.user.role === "admin" ? "admin" : "translator"} initial={view} initialError={error} />;
  } else if (p.entry) {
    const entry = await loadDictionaryEntry(s.token, p.entry);
    body = entry ? (
      <DictEntryDetail entry={entry} backQuery={p.q} />
    ) : (
      <div data-dict-notfound>
        <p className="mb-2 text-sm">{DICT_WORDS.notFound}</p>
        <Link href={dictHref({ q: p.q })} className="text-sm text-accent underline">
          ‹ {DICT_WORDS.back}
        </Link>
      </div>
    );
  } else {
    const list = await loadDictionaryList(s.token, p.q, p.screen);
    body = <DictionaryPanel initial={list} query={p.q} key={`${p.q}|${p.screen}`} />;
  }

  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} linkVisitor={linkVisitor} onDictionary />
      {!s.user.approved ? (
        <p role="status" className="mb-4 rounded border border-line bg-white p-3 text-sm" data-waiting>
          {WAITING}
        </p>
      ) : null}
      <h1 className="mb-3 text-2xl font-semibold">{DICT_WORDS.title}</h1>
      {proposalsOn && s.user.approved ? (
        // Unit VW129 (Q-A 3:129.4 row 1): two real buttons "Dictionary" and "Agent proposals (N open)" with the look of the Monitor tabs (components/Tabs.tsx).
        <nav aria-label="Dictionary tabs" className="mb-4 flex flex-wrap gap-1.5 border-b-2 border-tab-on pb-2" data-dict-tabs>
          {[
            { id: "entries", label: <>{DICT_WORDS.title}</>, href: dictHref(), on: !onProposals },
            { id: "proposals", label: <ProposalsTabLabel initial={openCount} />, href: dictHref({ tab: PROPOSALS_TAB }), on: onProposals },
          ].map((t) => (
            <Link
              key={t.id}
              href={t.href}
              prefetch={false}
              aria-current={t.on ? "page" : undefined}
              data-dict-tab={t.id}
              className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded border-2 px-4 py-1 text-sm font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0 md:py-1.5 ${t.on ? "border-tab-on bg-tab-on" : "border-line bg-white hover:border-tab-on"}`}
            >
              {/* The color sits on a span, because the rule "a { color: inherit }" of app/globals.css wins over a color class on the link (see components/Tabs.tsx). */}
              <span className={t.on ? "text-tab-on-ink" : "text-foreground"}>{t.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {body}
    </>
  );
}
