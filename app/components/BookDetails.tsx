"use client";
import { useState } from "react";
import type { BookDetail, ChapterArticle, ChapterRow, ChapterWeb, WebRow } from "@/lib/types";
import { pageRange } from "@/lib/chapters";
import { describeValue, groupMetadata } from "@/lib/meta-fields";

// Round 47 answer 13 (Q-A 2026-10-27 l35): "Books tab shows all metadata". Round 48 answer 9 (Q-A 2026-10-27 l55): "the Books Details part
// loaded on request" and "the web candidates per chapter". The part is closed at start. It asks /api/books/<id> when the owner opens it,
// so the page /books carries no metadata row and no chapter list. This keeps the HTML small.

const DASH = <span className="text-muted">–</span>;

export default function BookDetails({ id, group, hasMeta, chapterCount }: { id: string; group: string; hasMeta: boolean; chapterCount: number | null }) {
  const [state, setState] = useState<{ data: BookDetail | null; error: string | null } | "idle" | "loading">("idle");

  function onToggle(open: boolean) {
    if (!open || state !== "idle") return;
    setState("loading");
    fetch(`/api/books/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => setState({ data: ok ? (body as BookDetail) : null, error: ok ? null : String(body?.error ?? "Error") }))
      .catch((e) => setState({ data: null, error: String(e) }));
  }

  return (
    <details className="rounded border border-line bg-stone-50/60" onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer select-none px-3 py-1 text-xs text-muted hover:text-foreground">
        Details of {id}
        {group === "magazine" ? ` and month chapters${chapterCount ? ` (${chapterCount})` : ""}` : ""}
        {hasMeta ? "" : " (no metadata row)"}
      </summary>
      <div className="space-y-4 border-t border-line p-3">
        {state === "idle" || state === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : state.error ? (
          <p className="text-sm text-red-700">{state.error}</p>
        ) : (
          <BookDetailBody d={state.data as BookDetail} />
        )}
      </div>
    </details>
  );
}

export function BookDetailBody({ d }: { d: BookDetail }) {
  return (
    <>
      {d.meta ? <MetaGroups meta={d.meta} /> : <p className="text-sm text-muted">No metadata row for this item.</p>}
      {d.group === "magazine" ? <Chapters rows={d.chapters} web={d.web} webFileFound={d.webFileFound} /> : null}
    </>
  );
}

function MetaGroups({ meta }: { meta: Record<string, unknown> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groupMetadata(meta).map((g) => (
        <section key={g.id}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
          <dl className="space-y-1 text-sm">
            {g.entries.map((e) => (
              <div key={e.key} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2">
                <dt className="font-mono text-xs text-muted">{e.key}</dt>
                <dd className="min-w-0 break-words">
                  <Value value={e.value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Value({ value }: { value: unknown }) {
  const d = describeValue(value);
  switch (d.kind) {
    case "empty":
      return DASH;
    case "text":
      return <span className="whitespace-pre-wrap">{d.text}</span>;
    case "list":
      return (
        <ul className="list-disc pl-4">
          {d.items.map((x, k) => (
            <li key={k}>{x}</li>
          ))}
        </ul>
      );
    case "json":
      return (
        <details>
          <summary className="cursor-pointer text-xs text-muted">{d.count} entries</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-2 text-xs">{d.text}</pre>
        </details>
      );
  }
}

// Month chapters of a magazine year (file item-metadata/magazine-chapters.jsonl from unit M1).
function Chapters({ rows, web, webFileFound }: { rows: ChapterRow[] | null; web: Record<string, ChapterWeb>; webFileFound: boolean }) {
  if (rows === null) return <p className="text-sm text-muted">No chapter file yet.</p>;
  if (rows.length === 0) return <p className="text-sm text-muted">The chapter file has no row for this magazine year.</p>;
  const title = rows.find((c) => c.bookTitleEn)?.bookTitleEn;
  const linked = rows.reduce((n, c) => n + c.articles.filter((a) => a.webLink).length, 0);
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Month chapters ({rows.length})</h3>
      {title ? <p className="mb-1 text-sm font-medium">{title}</p> : null}
      <p className="mb-2 text-xs text-muted">
        {webFileFound ? `${linked} articles of this year link to a web article.` : "No web candidate file found."}
      </p>
      <ul className="space-y-1">
        {rows.map((c) => (
          <li key={c.chapter} className="rounded border border-line bg-white">
            <details>
              <summary className="cursor-pointer px-3 py-1 text-sm">
                <span className="font-medium">{c.chapterTitleEn || c.chapter}</span>
                {c.chapterTitleJa ? <span className="font-ja ml-2 text-xs text-muted">{c.chapterTitleJa}</span> : null}
                <span className="ml-3 text-xs text-muted">
                  {pageRange(c.pageStart, c.pageEnd)}, {c.articleCount} {c.articleCount === 1 ? "article" : "articles"}
                  {web[c.chapter] ? `, ${web[c.chapter].linked.length} linked web ${web[c.chapter].linked.length === 1 ? "article" : "articles"}` : ""}
                </span>
              </summary>
              <Articles chapter={c} />
              <WebCandidates chapter={c.chapter} web={web[c.chapter]} />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Articles({ chapter }: { chapter: ChapterRow }) {
  if (chapter.articles.length === 0) return <p className="border-t border-line px-3 py-2 text-xs text-muted">No article in this chapter.</p>;
  return (
    <table className="w-full border-t border-line text-xs">
      <thead className="text-left uppercase tracking-wide text-muted">
        <tr>
          <th className="px-3 py-1">Order</th>
          <th className="px-3 py-1">Series</th>
          <th className="px-3 py-1">Title</th>
          <th className="px-3 py-1">Pages</th>
          <th className="px-3 py-1">Web article</th>
        </tr>
      </thead>
      <tbody>
        {chapter.articles.map((a, k) => (
          <tr key={k} className="border-t border-line align-top">
            <td className="px-3 py-1 tabular-nums">{a.order ?? "–"}</td>
            <td className="px-3 py-1 font-ja">{a.seriesJa || DASH}</td>
            <td className="px-3 py-1">
              <div className="font-ja">{a.titleJa || DASH}</div>
              <div className="text-muted">
                {a.titleEn || DASH}
                {a.titleEnStatus === "draft" ? <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-amber-800">draft</span> : a.titleEnStatus ? <span className="ml-1.5">({a.titleEnStatus})</span> : null}
              </div>
            </td>
            <td className="px-3 py-1 whitespace-nowrap">
              {pageRange(a.pageStart, a.pageEnd)}
              {a.pageGuess ? <span className="ml-1.5 rounded bg-stone-200 px-1.5 text-stone-700">guess</span> : null}
            </td>
            <td className="px-3 py-1">
              <WebLinkCell a={a} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Key web_link of an article row (unit M2). A row without the key, or with null, shows a dash.
function WebLinkCell({ a }: { a: ChapterArticle }) {
  const w = a.webLink;
  if (!w) return DASH;
  return (
    <div>
      <div>{w.titleEn || w.titleJa || w.recordId}</div>
      <div className="text-muted">
        {w.total !== null ? `score ${w.total.toFixed(4)}` : "no score"}
        {w.status ? `, ${w.status}` : ""}
      </div>
      {w.url ? (
        <a href={w.url} target="_blank" rel="noreferrer" className="break-all text-accent underline-offset-2 hover:underline">
          {w.url}
        </a>
      ) : null}
    </div>
  );
}

// Web rows of web-magazine-candidates.jsonl for one chapter: rows whose link points here, then rows with a candidate here and no link here.
function WebCandidates({ chapter, web }: { chapter: string; web: ChapterWeb | undefined }) {
  if (!web) return <p className="border-t border-line px-3 py-2 text-xs text-muted">No web article names this chapter.</p>;
  return (
    <div className="space-y-2 border-t border-line px-3 py-2 text-xs">
      <h4 className="font-semibold uppercase tracking-wide text-muted">Web candidates of this chapter</h4>
      {web.linked.length > 0 ? (
        <div>
          <p className="mb-1 text-muted">Linked web articles ({web.linked.length})</p>
          <ul className="space-y-1.5">
            {web.linked.map((r) => (
              <WebRowItem key={r.recordId} row={r} chapter={chapter} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted">No web article links to this chapter.</p>
      )}
      {web.other.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-muted">Web articles with a candidate here and no link here ({web.other.length})</summary>
          <ul className="mt-1 space-y-1.5">
            {web.other.map((r) => (
              <WebRowItem key={r.recordId} row={r} chapter={chapter} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function WebRowItem({ row, chapter }: { row: WebRow; chapter: string }) {
  return (
    <li className="rounded border border-line p-2">
      <div className="font-ja">{row.titleJa || DASH}</div>
      <div className="text-muted">{row.titleEn}</div>
      <div className="mt-0.5">
        <span className="text-muted">{row.stampText}</span>
        {row.status ? <span className="ml-2 rounded bg-stone-100 px-1.5">{row.status}</span> : null}
        {row.linkStatus ? <span className="ml-2 rounded bg-blue-50 px-1.5 text-blue-800">link: {row.linkStatus}</span> : <span className="ml-2 text-muted">no link_status</span>}
        {row.link ? <span className="ml-2">links to order {row.link.order ?? "–"}{row.link.total !== null ? `, score ${row.link.total.toFixed(4)}` : ""}</span> : null}
      </div>
      {row.url ? (
        <a href={row.url} target="_blank" rel="noreferrer" className="break-all text-accent underline-offset-2 hover:underline">
          {row.url}
        </a>
      ) : null}
      <details className="mt-1">
        <summary className="cursor-pointer text-muted">{row.candidates.length} candidates</summary>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          {row.candidates.map((c, k) => {
            const isLink = !!row.link && c.chapter === row.link.chapter && c.order === row.link.order;
            return (
              <li key={k} className={c.chapter === chapter ? "font-medium" : "text-muted"}>
                <span className="font-mono">{c.chapter}</span> order {c.order ?? "–"}, <span className="font-ja">{c.titleJa}</span>, score {c.total === null ? "–" : c.total.toFixed(4)}
                {isLink ? <span className="ml-1.5 rounded bg-green-100 px-1.5 text-green-800">link</span> : null}
              </li>
            );
          })}
        </ol>
      </details>
    </li>
  );
}
