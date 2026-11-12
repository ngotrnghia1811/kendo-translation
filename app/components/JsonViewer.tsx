"use client";
import { useMemo, useState } from "react";
import { countText, parseJsonText, parseJsonlText, rowTitle, startsOpen, type JsonViewKind, type JsonlRow, type OpenMode } from "@/lib/json-view";
// Unit VW92 (round 91): the error lines show no parse message of the engine (it differs between Node and Firefox, React error #418). See lib/json-error-text.ts.
import { jsonErrorText, jsonlErrorText } from "@/lib/json-error-text";

// Unit VW89 (round 90), Q-A 3:1.8 (2026-11-09 16:55 PST):
//   item 1 "Tree view": keys on their own lines, each part opens and closes, the first 2 levels open, own colors for keys, text,
//          numbers and true/false in each theme, long text wraps, buttons "Open all", "Close all", "Raw" (the plain text).
//   item 2 "JSONL rows closed": one closed line per record with its first 3 keys as a short title. A click opens the record as a tree.
//          A plain text file shows as it is.
//   item 3 "No new package": plain React code. The colors are the tokens --json-* of app/globals.css (tested by scripts/contrast-dark.mjs).
// Client component only for the open and close state.

const BTN = "rounded border border-line bg-white px-3 py-1 text-sm hover:bg-stone-50";

export default function JsonViewer({ path, kind, size, text }: { path: string; kind: JsonViewKind; size: string; text: string }) {
  const [mode, setMode] = useState<OpenMode>("default");
  const [gen, setGen] = useState(0);
  const [raw, setRaw] = useState(false);
  const json = useMemo(() => (kind === "json" ? parseJsonText(text) : null), [kind, text]);
  const rows = useMemo(() => (kind === "jsonl" ? parseJsonlText(text) : null), [kind, text]);
  const broken = rows ? rows.filter((r) => !r.ok).length : 0;
  const tree = kind !== "text" && !(json && !json.ok);
  const set = (m: OpenMode) => {
    setMode(m);
    setGen((g) => g + 1);
    setRaw(false);
  };
  const facts = kind === "json" ? "JSON" : kind === "jsonl" ? `JSONL, ${rows?.length ?? 0} ${rows?.length === 1 ? "record" : "records"}${broken ? `, ${broken} not valid` : ""}` : "Text";
  return (
    <div data-json-file={path} data-json-kind={kind}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm text-muted">
          {facts}, {size}
        </span>
        {tree ? (
          <div className="flex gap-2" role="group" aria-label="Tree buttons">
            <button type="button" className={BTN} onClick={() => set("all")}>
              Open all
            </button>
            <button type="button" className={BTN} onClick={() => set("none")}>
              Close all
            </button>
            <button type="button" className={BTN + (raw ? " font-semibold" : "")} aria-pressed={raw} onClick={() => setRaw((r) => !r)}>
              Raw
            </button>
          </div>
        ) : null}
      </div>
      {json && !json.ok ? (
        <p data-json-error className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {jsonErrorText(json.line, json.column)}
        </p>
      ) : null}
      <div className="rounded border border-line bg-white p-4">
        {kind === "text" || raw || (json && !json.ok) ? (
          <pre data-json-raw className="whitespace-pre-wrap break-words font-mono text-sm">
            {text}
          </pre>
        ) : json && json.ok ? (
          <div key={gen} data-json-tree className="font-mono text-sm">
            <Node name={null} value={json.value} depth={0} mode={mode} />
          </div>
        ) : rows ? (
          <ol key={gen} data-json-rows className="font-mono text-sm">
            {rows.length === 0 ? <li className="text-muted">This file holds no record.</li> : rows.map((r) => <Row key={r.line} row={r} mode={mode} />)}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

/** One JSONL record: a closed line with the line number and the short title. */
function Row({ row, mode }: { row: JsonlRow; mode: OpenMode }) {
  const [open, setOpen] = useState(() => mode === "all");
  if (!row.ok) {
    return (
      <li data-row-error={row.line} className="border-t border-line py-1 first:border-t-0">
        <span className="text-red-700">
          {jsonlErrorText(row)}
        </span>
        <pre className="whitespace-pre-wrap break-words text-muted">{row.raw}</pre>
      </li>
    );
  }
  return (
    <li data-row={row.line} className="border-t border-line py-1 first:border-t-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-baseline gap-2 text-left hover:bg-stone-50">
        <span aria-hidden="true" className="w-3 shrink-0 text-muted">
          {open ? "▾" : "▸"}
        </span>
        <span className="shrink-0 text-muted tabular-nums">Line {row.line}</span>
        <span className="min-w-0 break-words">{rowTitle(row.value)}</span>
      </button>
      {open ? (
        <div className="ml-5 mt-1">
          <Node name={null} value={row.value} depth={0} mode={mode === "all" ? "all" : "default"} />
        </div>
      ) : null}
    </li>
  );
}

function Key({ name }: { name: string | number | null }) {
  if (name === null) return null;
  return typeof name === "number" ? <span className="text-muted">{name}:</span> : <span className="text-json-key">{JSON.stringify(name)}:</span>;
}

function Leaf({ value }: { value: unknown }) {
  // The text shows as it is (line breaks kept) between quote marks, so a prompt text reads like the file text.
  if (typeof value === "string") return <span className="whitespace-pre-wrap break-words text-json-string">&quot;{value}&quot;</span>;
  if (typeof value === "number") return <span className="text-json-number">{String(value)}</span>;
  return <span className="text-json-literal">{String(value)}</span>;
}

/** One node of the tree. An object or a list opens and closes with its button. Other values show on one line, and long text wraps. */
function Node({ name, value, depth, mode }: { name: string | number | null; value: unknown; depth: number; mode: OpenMode }) {
  const [open, setOpen] = useState(() => startsOpen(mode, depth));
  if (value === null || typeof value !== "object") {
    return (
      <div className="py-px">
        <span className="ml-4">
          <Key name={name} /> <Leaf value={value} />
        </span>
      </div>
    );
  }
  const list = Array.isArray(value);
  const entries: [string | number, unknown][] = list ? (value as unknown[]).map((v, i) => [i, v]) : Object.entries(value as Record<string, unknown>);
  const [a, b] = list ? ["[", "]"] : ["{", "}"];
  if (entries.length === 0) {
    return (
      <div className="py-px">
        <span className="ml-4">
          <Key name={name} /> <span className="text-muted">{a + b}</span>
        </span>
      </div>
    );
  }
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="py-px text-left hover:bg-stone-50">
        <span aria-hidden="true" className="inline-block w-4 text-muted">
          {open ? "▾" : "▸"}
        </span>
        <Key name={name} />{" "}
        <span className="text-muted">
          {a} {countText(value)} {b}
        </span>
      </button>
      {open ? (
        <ul className="ml-2 border-l border-line pl-3">
          {entries.map(([k, v]) => (
            <li key={k}>
              <Node name={k} value={v} depth={depth + 1} mode={mode} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
