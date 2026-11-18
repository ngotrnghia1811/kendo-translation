import type { PanelData } from "@/lib/htv-panel";
import { panelCards, type CardBlock, type EntryCard, type MarksCard, type NoteCard, type PairCard, type PanelCard, type ResultCard } from "@/lib/htv-panel-cards";

// Round 51 answer 8 (Q-A 2026-10-28 l53): the panel shows the information that the TL_3 agent got, next to the ED_3 text.
// Round 53 answers 5 and 6 (l99, l100): no fixed text, blocks of the whole page.
// Round 58 answer 5 (l203) and round 59 answer 6 (l224): cards and plain lists, EN text in sans-serif, the JA font for JA text only,
// no entry_id, store, source, or stance line, no JA text block. Order: dictionary lookup, book translation memory,
// aligned translation memory, lower pair, previous page pair, earlier term marks. The parser sits in lib/htv-panel-cards.ts.
// Round 55 answer 6 (l151): a long block starts closed.

const OPEN_LIMIT = 40; // [unit default] a block with more lines than this starts closed

function More({ children, label = "more" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer select-none text-accent underline">{label}</summary>
      <div className="mt-1">{children}</div>
    </details>
  );
}

function PageLink({ slug, page, current, children }: { slug: string; page: string; current: string; children: React.ReactNode }) {
  const href = slug === current ? `#${page}` : `/translate/${encodeURIComponent(slug)}?at=${page}#${page}`;
  return (
    <a href={href} className="text-accent underline">
      {children}
    </a>
  );
}

function Entry({ c }: { c: EntryCard }) {
  return (
    <div className="rounded border border-line bg-white/60 p-2" data-card="entry">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-ja text-[1.25em] font-semibold" lang="ja">
          {c.headword}
        </span>
        {c.reading ? (
          <span className="font-ja text-[0.9em] text-muted" lang="ja">
            {c.reading}
          </span>
        ) : null}
      </div>
      {c.variants ? <div className="font-ja text-[0.85em] text-muted">written variants: {c.variants}</div> : null}
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold">{c.romaji}</span>
        {c.common ? <span className="rounded bg-stone-200 px-1.5 text-[0.8em] text-stone-700">{c.common}</span> : null}
      </div>
      {c.concise ? <div>{c.concise}</div> : null}
      {c.detailed ? (
        <More>
          <p className="whitespace-pre-wrap">{c.detailed}</p>
        </More>
      ) : null}
      {c.more.length > 0 ? (
        <More label="other lines">
          <p className="whitespace-pre-wrap text-[0.85em]">{c.more.join("\n")}</p>
        </More>
      ) : null}
    </div>
  );
}

function Pair({ c, slug }: { c: PairCard; slug: string }) {
  return (
    <div className="rounded border border-line bg-white/60 p-2" data-card="pair">
      <div className="mb-1 text-[0.8em]">
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800">
          {c.page ? (
            <PageLink slug={c.page.slug} page={c.page.page} current={slug}>
              {c.chip}
            </PageLink>
          ) : (
            c.chip
          )}
        </span>
      </div>
      <div className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-1">
        <span className="text-[0.8em] font-semibold text-muted">JA</span>
        <span className="font-ja whitespace-pre-wrap" lang="ja">
          {c.ja}
        </span>
        <span className="text-[0.8em] font-semibold text-muted">EN</span>
        <span className="whitespace-pre-wrap">{c.en}</span>
      </div>
      {c.more.length > 0 ? (
        <More label="other lines">
          <p className="whitespace-pre-wrap text-[0.85em]">{c.more.join("\n")}</p>
        </More>
      ) : null}
    </div>
  );
}

function Result({ c }: { c: ResultCard }) {
  return (
    <div data-card="result">
      {c.from ? <div className="mb-1 text-[0.85em] font-semibold text-muted">From: {c.from}</div> : null}
      {c.lines ? (
        <div className="grid grid-cols-[3.75rem_1fr] gap-x-2 gap-y-0.5">
          {c.lines.map((l, i) => (
            <div key={i} className="contents">
              <span className="font-mono text-[0.75em] text-muted" title={l.full}>
                {l.id}
              </span>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <More label="result (not readable as lines)">
          <p className="whitespace-pre-wrap break-words text-[0.85em]">{c.resultRaw}</p>
        </More>
      )}
      {c.rationale ? (
        <More label="more (rationale)">
          <p className="whitespace-pre-wrap">{c.rationale}</p>
        </More>
      ) : null}
      {c.more.length > 0 ? (
        <More label="other lines">
          <p className="whitespace-pre-wrap text-[0.85em]">{c.more.join("\n")}</p>
        </More>
      ) : null}
    </div>
  );
}

function Marks({ c, slug }: { c: MarksCard; slug: string }) {
  return (
    <div data-card="marks">
      <div className="mb-1 text-[0.85em] text-muted">
        {c.bookId ? <span className="font-mono">{c.bookId}</span> : null}
        {c.pagesRead ? <span>, {c.pagesRead} pages read.</span> : null}
        {c.rows.length === 0 ? <span> No earlier marks.</span> : null}
      </div>
      {c.rows.length > 0 ? (
        <table className="w-full text-left">
          <thead className="text-[0.75em] uppercase tracking-wide text-muted">
            <tr>
              <th className="pr-2 font-normal">JA</th>
              <th className="pr-2 font-normal">EN term</th>
              <th className="pr-2 font-normal">First used on page</th>
              <th className="font-normal">Result</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r, i) => (
              <tr key={i} className="border-t border-line/60 align-top">
                <td className="py-0.5 pr-2 font-ja" lang="ja">
                  {r.ja}
                </td>
                <td className="pr-2">{r.enTerm}</td>
                <td className="pr-2 text-[0.85em]">
                  {r.firstPage ? (
                    <PageLink slug={r.firstPage.slug} page={r.firstPage.page} current={slug}>
                      {r.firstPage.slug === slug ? r.firstPage.page : r.firstPageText}
                    </PageLink>
                  ) : (
                    r.firstPageText
                  )}
                </td>
                <td className={r.result === "follows" ? "text-[0.85em]" : "text-[0.85em] font-semibold text-amber-800"}>{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {c.more.length > 0 ? (
        <More label="other lines">
          <p className="whitespace-pre-wrap text-[0.85em]">{c.more.join("\n")}</p>
        </More>
      ) : null}
    </div>
  );
}

// Unit VW110 (Q-A 3:74.5 part 4, Q-A 3:72.2): the "Book:" line shows the book title when the ID of the line is the book on the screen and the book has a title.
// The ID (the file name) is then the hover text. Another ID, or a book with no title, shows the ID as before.
function Note({ c, slug, bookTitle }: { c: NoteCard; slug: string; bookTitle: string }) {
  const named = !!c.bookId && c.bookId === slug && !!bookTitle;
  return (
    <div className="text-[0.85em] text-muted" data-card="note">
      {c.bookId ? (
        <div>
          Book:{" "}
          {named ? (
            <span title={c.bookId} data-note-book-title>
              {bookTitle}
            </span>
          ) : (
            c.bookId
          )}
        </div>
      ) : null}
      {c.found ? <div>{c.found}</div> : null}
      {c.requested ? (
        <More label="Words looked up">
          <p className="whitespace-pre-wrap font-ja" lang="ja">
            {c.requested}
          </p>
        </More>
      ) : null}
      {c.more.length > 0 ? (
        <More label="other lines">
          <p className="whitespace-pre-wrap">{c.more.join("\n")}</p>
        </More>
      ) : null}
    </div>
  );
}

function Card({ c, slug, bookTitle }: { c: PanelCard; slug: string; bookTitle: string }) {
  switch (c.kind) {
    case "entry":
      return <Entry c={c} />;
    case "pair":
      return <Pair c={c} slug={slug} />;
    case "result":
      return <Result c={c} />;
    case "marks":
      return <Marks c={c} slug={slug} />;
    case "note":
      return <Note c={c} slug={slug} bookTitle={bookTitle} />;
    case "text":
      return <p className="whitespace-pre-wrap text-[0.85em]">{c.lines.join("\n")}</p>;
  }
}

function Block({ b, slug, bookTitle }: { b: CardBlock; slug: string; bookTitle: string }) {
  return (
    <details open={b.lineCount <= OPEN_LIMIT} className="border-b border-line/70 py-1.5" data-block={b.name}>
      <summary className="cursor-pointer select-none font-semibold">
        {b.label}
        <span className="ml-2 text-[0.8em] font-normal text-muted">
          {b.itemCount > 0 ? `${b.itemCount} items, ` : ""}
          {b.lineCount} lines
        </span>
      </summary>
      <div className="mt-1.5 space-y-2">
        {b.cards.map((c, i) => (
          <Card key={i} c={c} slug={slug} bookTitle={bookTitle} />
        ))}
      </div>
    </details>
  );
}

/**
 * The TL_3 information panel of one page. `slug` is the book on the screen, so that a page chip can link inside the screen.
 * `bookTitle` (unit VW110) is the title of that book, "" when it has none. The "Book:" line of the Note card uses it.
 */
export default function Tl3Panel({ panel, slug, bookTitle = "" }: { panel: PanelData; slug: string; bookTitle?: string }) {
  const blocks = panel.available ? panelCards(panel.blocks) : [];
  const shown = blocks.reduce((s, b) => s + b.lineCount, 0);
  return (
    <section aria-label="TL_3 information panel">
      <h2 className="sr-only">TL_3 information panel</h2>
      {panel.available ? (
        <>
          <p className="mt-0.5 text-[0.8em] text-muted">
            Panel lines: {shown} of {panel.totalLines} message lines. Information of the whole page.
          </p>
          {blocks.map((b) => (
            <Block key={b.name} b={b} slug={slug} bookTitle={bookTitle} />
          ))}
        </>
      ) : (
        <p className="mt-1 text-muted">{panel.note}</p>
      )}
    </section>
  );
}
