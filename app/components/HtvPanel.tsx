import type { PanelData } from "@/lib/htv-panel";
import { firstPageChip, pairChip, panelCards, type CardBlock, type EntryCard, type MarksCard, type NoteCard, type PairCard, type PanelCard, type ResultCard } from "@/lib/htv-panel-cards";

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

function PageLink({ slug, page, current, title, children }: { slug: string; page: string; current: string; title?: string; children: React.ReactNode }) {
  const href = slug === current ? `#${page}` : `/translate/${encodeURIComponent(slug)}?at=${page}#${page}`;
  return (
    <a href={href} className="text-accent underline" title={title || undefined}>
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

// Unit VW111 (Q-A 3:76.2 "Short title in the chip"): the chip shows the short title of the book, "p3" and the pair, for example "How to Create an Ideal Kamae · p3 · P01".
// The full title and the page ID are the hover text. A book with no title in `titles` keeps the older text "slug/page · pair".
function Pair({ c, slug, titles }: { c: PairCard; slug: string; titles: Record<string, string> }) {
  const chip = pairChip(c, titles);
  return (
    <div className="rounded border border-line bg-white/60 p-2" data-card="pair">
      <div className="mb-1 text-[0.8em]">
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800" data-pair-chip title={chip.hover || undefined}>
          {c.page ? (
            <PageLink slug={c.page.slug} page={c.page.page} current={slug} title={chip.hover}>
              {chip.text}
            </PageLink>
          ) : (
            chip.text
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

// Unit VW111 (Q-A 3:76.1 place 1, Q-A 3:72.2): the book of the marks shows its title, the ID (the file name) is the hover text (the rule of the Note card).
// The title of the book on the screen is `bookTitle`, the title of another book is in `titles`. A book with no title shows the ID as before.
// The cell "First used on page" of another book shows the short title and "p3" (Q-A 3:76.2), the page ID is the hover text.
function Marks({ c, slug, bookTitle, titles }: { c: MarksCard; slug: string; bookTitle: string; titles: Record<string, string> }) {
  const markTitle = (c.bookId === slug ? bookTitle : "") || (titles[c.bookId] ?? "");
  return (
    <div data-card="marks">
      <div className="mb-1 text-[0.85em] text-muted">
        {c.bookId ? (
          markTitle ? (
            <span title={c.bookId} data-marks-book-title>
              {markTitle}
            </span>
          ) : (
            <span className="font-mono">{c.bookId}</span>
          )
        ) : null}
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
                    <PageLink slug={r.firstPage.slug} page={r.firstPage.page} current={slug} title={r.firstPage.slug === slug ? undefined : firstPageChip(r.firstPage, r.firstPageText, titles).hover}>
                      {r.firstPage.slug === slug ? r.firstPage.page : firstPageChip(r.firstPage, r.firstPageText, titles).text}
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

function Card({ c, slug, bookTitle, titles }: { c: PanelCard; slug: string; bookTitle: string; titles: Record<string, string> }) {
  switch (c.kind) {
    case "entry":
      return <Entry c={c} />;
    case "pair":
      return <Pair c={c} slug={slug} titles={titles} />;
    case "result":
      return <Result c={c} />;
    case "marks":
      return <Marks c={c} slug={slug} bookTitle={bookTitle} titles={titles} />;
    case "note":
      return <Note c={c} slug={slug} bookTitle={bookTitle} />;
    case "text":
      return <p className="whitespace-pre-wrap text-[0.85em]">{c.lines.join("\n")}</p>;
  }
}

function Block({ b, slug, bookTitle, titles }: { b: CardBlock; slug: string; bookTitle: string; titles: Record<string, string> }) {
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
          <Card key={i} c={c} slug={slug} bookTitle={bookTitle} titles={titles} />
        ))}
      </div>
    </details>
  );
}

/**
 * The TL_3 information panel of one page. `slug` is the book on the screen, so that a page chip can link inside the screen.
 * `bookTitle` (unit VW110) is the title of that book, "" when it has none. The "Book:" line of the Note card uses it.
 * `panel.bookTitles` (unit VW111) maps the slug of each book that the panel names to its title. The server adds it (lib/htv-book-titles.ts).
 */
export default function Tl3Panel({ panel, slug, bookTitle = "" }: { panel: PanelData; slug: string; bookTitle?: string }) {
  const titles = panel.bookTitles ?? {};
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
            <Block key={b.name} b={b} slug={slug} bookTitle={bookTitle} titles={titles} />
          ))}
        </>
      ) : (
        <p className="mt-1 text-muted">{panel.note}</p>
      )}
    </section>
  );
}
