"use client";
import { useEffect, useState } from "react";
import { pstTime } from "@/lib/htv-pst"; // unit TF83: PST on /admin (round 82 answer 14)
import type { AdminVersion } from "@/lib/pb";
import { factLine } from "@/lib/reader-layout";
import type { ReaderFact } from "@/lib/reader-types";
import { titledPage } from "@/lib/readable-names";

// Panel of one page on /admin/versions (unit RC1, round 63 answer 6, Q-A 2026-10-28 l310: "Admin page /admin/versions", "Collection page_checks").
// It lists the saved human versions of the page (translator name, version number, date, row count), shows a preview, chooses one for the readers,
// removes the choice, and adds or removes the page check. The routes /api/admin/versions and /api/admin/checks check the admin role.
interface Info {
  versions: AdminVersion[];
  chosen: { userId: string; version: number } | null;
  check: { date: string; note: string } | null;
}
interface PreviewRow {
  key: string;
  shortKey: string;
  ja: string;
  agent: string;
  human: string;
  kind: string;
  /** Fact marks of the kendojidai.com text (unit RT73b). Empty for the version of a translator. */
  facts: ReaderFact[];
}

// Unit VW111 (Q-A 3:76.1 place 5): `bookTitle` is the title of the book of the page, "" when it has none. The heading then reads "<title> · page 12" and the page ID is the hover text.
export default function AdminVersionPanel({ pageId, bookTitle = "" }: { pageId: string; bookTitle?: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ who: string; rows: PreviewRow[] } | null>(null);
  const [note, setNote] = useState("");

  const [tick, setTick] = useState(0);
  // The page list gives the panel a key, so a new page makes a new panel. The effect loads the versions. A change bumps tick to load again.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetch(`/api/admin/versions?pageId=${encodeURIComponent(pageId)}`);
      const j = (await r.json().catch(() => ({}))) as Partial<Info> & { error?: string };
      if (!alive) return;
      if (!r.ok) setError(j.error ?? "The versions were not read.");
      else setInfo({ versions: j.versions ?? [], chosen: j.chosen ?? null, check: j.check ?? null });
    })();
    return () => {
      alive = false;
    };
  }, [pageId, tick]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "The change failed.");
      else setTick((t) => t + 1);
    } finally {
      setBusy(false);
    }
  }
  async function show(v: AdminVersion) {
    const r = await fetch(`/api/admin/versions?pageId=${encodeURIComponent(pageId)}&userId=${encodeURIComponent(v.userId)}&version=${v.version}`);
    const j = (await r.json().catch(() => ({}))) as { rows?: PreviewRow[]; error?: string };
    if (!r.ok) setError(j.error ?? "The preview failed.");
    else setPreview({ who: `${v.userName}, version ${v.version}`, rows: j.rows ?? [] });
  }

  const btn = "min-h-[36px] rounded border border-line px-2 py-0.5 text-sm disabled:opacity-50";
  return (
    <section data-version-panel={pageId} aria-label={`Human versions of ${pageId}`}>
      <h2 className="section-band mb-2 text-lg font-semibold" title={`Page ID ${pageId}`} data-version-heading>{titledPage(pageId, bookTitle)}</h2>
      {error ? <p role="alert" className="mb-2 text-sm text-red-700">{error}</p> : null}
      {!info ? <p className="text-sm text-muted">Loading…</p> : null}
      {info ? (
        <>
          <div className="mb-4 rounded border border-line bg-white p-3 text-sm" data-check-box>
            <p data-check-state>{info.check ? `A person checked this page on ${info.check.date}.${info.check.note ? ` Note: ${info.check.note}` : ""}` : "No person has checked this page yet."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {info.check ? (
                <button type="button" disabled={busy} onClick={() => void post("/api/admin/checks", { action: "clear", pageId })} data-check-clear className={btn}>
                  Remove the page check
                </button>
              ) : (
                <>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional)" aria-label="Note for the page check" className="rounded border border-line bg-white px-2 py-1 text-sm" />
                  <button type="button" disabled={busy} onClick={() => void post("/api/admin/checks", { action: "set", pageId, note })} data-check-set className={btn + " bg-accent font-semibold text-white"}>
                    Mark as checked by a person
                  </button>
                </>
              )}
            </div>
          </div>
          <h3 className="mb-1 text-base font-semibold">Saved human versions</h3>
          {info.versions.length === 0 ? <p className="text-sm text-muted" data-no-versions>No translator saved a version of this page.</p> : null}
          <ul className="space-y-2">
            {info.versions.map((v) => {
              const isChosen = info.chosen?.userId === v.userId && info.chosen.version === v.version;
              return (
                <li key={`${v.userId}-${v.version}`} data-version={`${v.userName}#${v.version}`} className="flex flex-wrap items-center gap-3 rounded border border-line bg-white p-3 text-sm">
                  <span className="font-medium">{v.userName}</span>
                  <span>version {v.version}</span>
                  <span className="text-muted">{pstTime(v.created)}</span>
                  <span className="text-muted">{v.rows} rows, {v.written} written, {v.agreed} agreed</span>
                  {isChosen ? <span className="rounded bg-stone-200 px-1.5 py-0.5 text-xs font-medium text-stone-700" data-chosen-tag>Shown to readers</span> : null}
                  <span className="ml-auto flex gap-2">
                    <button type="button" onClick={() => void show(v)} data-preview className={btn}>
                      Preview
                    </button>
                    {isChosen ? (
                      <button type="button" disabled={busy} onClick={() => void post("/api/admin/versions", { action: "clear", pageId })} data-clear className={btn}>
                        Remove the choice
                      </button>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => void post("/api/admin/versions", { action: "choose", pageId, userId: v.userId, version: v.version })} data-choose className={btn + " bg-accent font-semibold text-white"}>
                        Show to readers
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {preview ? (
            <div className="mt-4" data-preview-box>
              <h3 className="mb-1 text-base font-semibold">Preview: {preview.who}</h3>
              <ul className="space-y-3">
                {preview.rows.map((r) => (
                  <li key={r.key} className="rounded border border-line p-2 text-sm" data-preview-row={r.shortKey}>
                    <p lang="ja" className="text-muted">{r.ja}</p>
                    <p>
                      {r.human || <span className="text-muted">(empty)</span>}
                      <span className="ml-2 text-xs text-muted">{r.kind === "own" ? "own text" : r.kind === "agree" ? "agent text, agreed" : "agent text"}</span>
                    </p>
                    {r.facts.map((f, i) => (
                      <p key={i} lang="ja" className="mt-1 text-xs text-muted" data-preview-fact={f.kind}>
                        fact {f.kind}: {factLine(f)}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
