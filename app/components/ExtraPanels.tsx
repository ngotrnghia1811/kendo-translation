"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { PageData } from "@/lib/types";
import { EXTRAS, type ExtraKey } from "./extras-store";
import { enFormBadge, enFormTone } from "@/lib/page-labels";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Round 43 answer 7 (Q-A l111): the extra items show under the text, one panel per ticked item.
// The data loads from /api/page-extra only when the item is ticked (fast loading).
export default function ExtraPanels({ page, stage, ticks }: { page: PageData; stage: number; ticks: Partial<Record<ExtraKey, boolean>> }) {
  const active = EXTRAS.filter((e) => ticks[e.key]);
  if (active.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      {active.map((e) => (
        <section key={e.key} className="rounded border border-line bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {e.label} <span className="font-normal text-muted">(stage {stage})</span>
          </h3>
          {e.key === "counts" ? <Counts page={page} /> : <Remote runRel={page.runRel} part={e.key} stage={stage} />}
        </section>
      ))}
    </div>
  );
}

function useExtra(runRel: string, part: string, stage: number): { data: any; error: string | null } {
  const key = `${runRel}|${part}|${stage}`;
  const [res, setRes] = useState<{ key: string; data: any; error: string | null } | null>(null);
  useEffect(() => {
    let cancel = false;
    const q = new URLSearchParams({ run: runRel, part, stage: String(stage) });
    fetch(`/api/page-extra?${q}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!cancel) setRes({ key, data: ok ? body : null, error: ok ? null : String(body?.error ?? "Error") });
      })
      .catch((e) => {
        if (!cancel) setRes({ key, data: null, error: String(e) });
      });
    return () => {
      cancel = true;
    };
  }, [key, runRel, part, stage]);
  return res && res.key === key ? { data: res.data, error: res.error } : { data: undefined, error: null };
}

function Remote({ runRel, part, stage }: { runRel: string; part: string; stage: number }) {
  const { data, error } = useExtra(runRel, part, stage);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (data === undefined) return <p className="text-sm text-muted">Loading…</p>;
  switch (part) {
    case "calls":
      return <Calls rows={data} />;
    case "messages":
      return <Messages rows={data} />;
    case "lookup":
      return <Lookup rows={data} />;
    case "failed":
      return <Failed d={data} />;
    case "programs":
      return <Programs d={data} />;
    case "critiques":
      return <Critiques rows={data} />;
  }
  return null;
}

const th = "px-2 py-1 text-left text-xs uppercase tracking-wide text-muted";
const td = "px-2 py-1 align-top";

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function Calls({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No model call for this stage.</Empty>;
  const cost = rows.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const sec = rows.reduce((s, r) => s + (r.seconds ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Call</th>
            <th className={th}>Model</th>
            <th className={th + " text-right"}>USD</th>
            <th className={th + " text-right"}>Seconds</th>
            <th className={th + " text-right"}>Retries</th>
            <th className={th}>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className="border-t border-line">
              <td className={td + " font-mono text-xs"}>{r.tag}</td>
              <td className={td + " text-xs"}>
                {r.model}
                {r.variant ? <span className="text-muted"> ({r.variant})</span> : null}
              </td>
              <td className={td + " text-right tabular-nums"}>{r.costUsd === null ? "–" : r.costUsd.toFixed(4)}</td>
              <td className={td + " text-right tabular-nums"}>{r.seconds ?? "–"}</td>
              <td className={td + " text-right tabular-nums"}>{r.retries}</td>
              <td className={td + " text-xs"}>
                {r.ok === false ? <span className="text-red-700">failed: {r.error}</span> : "ok"}
                {r.flag ? <span className="ml-1 text-amber-700">flag: {String(r.flag)}</span> : null}
                {r.jsonRepairKind ? <span className="ml-1 text-amber-700">JSON repaired: {r.jsonRepairKind}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-medium">
            <td className={td} colSpan={2}>
              Total
            </td>
            <td className={td + " text-right tabular-nums"}>{cost.toFixed(4)}</td>
            <td className={td + " text-right tabular-nums"}>{sec.toFixed(1)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Messages({ rows }: { rows: { tag: string; text: string }[] }) {
  if (rows.length === 0) return <Empty>No saved message for this stage.</Empty>;
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <details key={m.tag} className="rounded border border-line">
          <summary className="cursor-pointer px-3 py-1.5 text-sm">
            <span className="font-mono text-xs">{m.tag}</span> <span className="text-muted">({m.text.length.toLocaleString("en-US")} characters)</span>
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-line bg-stone-50 p-3 text-xs leading-relaxed">{m.text}</pre>
        </details>
      ))}
    </div>
  );
}

function Lookup({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No lookup file for this stage.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.box}>
          <div className="mb-1 font-mono text-xs font-semibold">{r.box}</div>
          {r.lookup ? (
            <div className="mb-2 text-sm">
              <span className="text-muted">Dictionary headwords found: </span>
              {(r.lookup.matched ?? []).length ? (r.lookup.matched as string[]).map((h) => (
                <span key={h} className="mr-1.5 rounded bg-stone-100 px-1.5 font-ja">
                  {h}
                </span>
              )) : "none"}
              <div className="text-xs text-muted">
                Search hits: {(r.lookup.search ?? []).slice(0, 8).map((s: [string, number]) => `${s[0]} ${s[1]}`).join(", ") || "none"}
              </div>
            </div>
          ) : null}
          {r.aligned ? (
            <ul className="space-y-1.5">
              {(r.aligned.pairs ?? []).map((p: any, k: number) => (
                <li key={k} className="rounded border border-line p-2 text-sm">
                  <div className="font-ja">{p.ja}</div>
                  <div className="font-serif">{p.en}</div>
                  <div className="text-xs text-muted">score {p.score}</div>
                </li>
              ))}
              {(r.aligned.pairs ?? []).length === 0 ? <Empty>No aligned pair found.</Empty> : null}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Failed({ d }: { d: any }) {
  const none = d.failed.length + d.flagged.length + d.failures.length === 0;
  if (none) return <Empty>No failed call and no flagged call on this page.</Empty>;
  return (
    <div className="space-y-3 text-sm">
      {d.failures.map((f: string, k: number) => (
        <p key={k} className="rounded border border-red-200 bg-red-50 p-2 text-red-800">
          {f}
        </p>
      ))}
      {d.failed.map((f: any) => (
        <div key={f.file} className="rounded border border-line p-2">
          <span className="font-mono text-xs">{f.tag}</span> <span className="text-xs text-muted">{f.model}</span>
          <div className="text-xs text-red-700">{f.error}</div>
          <div className="text-xs text-muted">
            retries {f.retries ?? 0}, {f.seconds ?? "–"} s, USD {f.costUsd ?? "–"}
          </div>
        </div>
      ))}
      {d.flagged.map((f: any, k: number) => (
        <div key={k} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
          <span className="font-mono">{f.tag}</span> flag: {String(f.flag)}
        </div>
      ))}
    </div>
  );
}

function Programs({ d }: { d: any }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">EN form check</h4>
        {d.enForm === null ? (
          <Empty>No file.</Empty>
        ) : d.enForm.length === 0 ? (
          <Empty>No term to check.</Empty>
        ) : (
          <>
            {d.enFormSummary ? (
              <p className="mb-1 text-xs">
                <span className="font-semibold">{d.enFormSummary.follows}</span> follows / <span className="font-semibold text-red-800">{d.enFormSummary.breaks}</span> breaks /{" "}
                <span className="font-semibold text-amber-800">{d.enFormSummary.notes}</span> notes
              </p>
            ) : null}
            <ul className="space-y-1">
              {d.enForm.map((i: any, k: number) => (
                <li key={k} className={enFormTone(i.result)}>
                  <span className="font-ja">{i.term}</span> → <span className="font-serif">{i.enForm}</span> <span className="text-xs">({i.use})</span>{" "}
                  <span className={"rounded px-1.5 text-xs font-semibold " + enFormBadge(i.result)}>{String(i.result)}</span>
                  {i.detail && i.detail !== "none" ? <span className="text-xs">: {i.detail}</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Term marks</h4>
        {d.termMarks === null ? (
          <Empty>No file.</Empty>
        ) : (
          <p>
            {d.termMarks.length} marks. Without a short English explanation: {d.termMarks.filter((m: any) => m.explained === false).length}.
          </p>
        )}
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Page structure check</h4>
        {d.structure === null ? (
          <Empty>No file.</Empty>
        ) : (
          <>
            <p>
              {d.structure.total} parts compared. Not found: {d.structure.notFound.length}.
            </p>
            <ul className="text-xs text-red-800">
              {d.structure.notFound.map((i: any, k: number) => (
                <li key={k}>
                  {i.part} {i.ts} → {i.ed ?? "none"}: {i.status} ({i.detail})
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Critiques({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No critique for this stage.</Empty>;
  return (
    <ul className="space-y-3">
      {rows.map((c, k) => (
        <li key={k} className="rounded border border-line p-3 text-sm">
          <div className="flex gap-3 text-xs text-muted">
            <span className="font-mono">{c.id}</span>
            <span>reviewed {c.reviewedBox}</span>
          </div>
          <p className="mt-1 font-medium">{c.failureMode}</p>
          <p className="mt-1 text-xs leading-relaxed">{c.reason}</p>
          {c.noteForNext ? (
            <p className="mt-2 rounded bg-amber-50 p-2 text-xs leading-relaxed">
              <span className="font-semibold">Note for the next critic: </span>
              {c.noteForNext}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Counts({ page }: { page: PageData }) {
  if (page.critiqueCounts.length === 0) return <Empty>No critique counts in summary.json.</Empty>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Critique group</th>
          <th className={th + " text-right"}>Critiques</th>
          <th className={th + " text-right"}>N</th>
          <th className={th}>Reached N</th>
          <th className={th}>Note</th>
        </tr>
      </thead>
      <tbody>
        {page.critiqueCounts.map((c) => (
          <tr key={c.boxType} className="border-t border-line">
            <td className={td + " font-mono text-xs"}>{c.boxType}</td>
            <td className={td + " text-right tabular-nums"}>{c.critiques}</td>
            <td className={td + " text-right tabular-nums"}>{c.n ?? "–"}</td>
            <td className={td}>{c.reachedN === null ? "–" : c.reachedN ? "yes" : "no"}</td>
            <td className={td + " text-xs text-muted"}>{c.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
