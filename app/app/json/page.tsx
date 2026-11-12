import Link from "next/link";
import { requireMonitor } from "@/lib/monitor";
import { loadJsonView } from "@/lib/json-view-load";
import { jsonViewHref, parentOf, pathParts, sizeMb, MAX_VIEW_BYTES } from "@/lib/json-view";
import JsonFolderList from "@/components/JsonFolderList";
import JsonViewer from "@/components/JsonViewer";
import { loadPlainLines } from "@/lib/json-view-lines-load";

export const dynamic = "force-dynamic";

// Unit VW89 (round 90): the JSON viewer /json?path=<file> on the Monitor dashboard "/" on this Mac.
// Owner note Q-A 2:9.2 (2026-11-08 12:10 PST): "Implement a simple beautiful json viewer so human can read the result/report on viewer".
// Accepted design Q-A 3:1.7 and 3:1.8 (2026-11-09 16:55 PST). With the monitor off, the page gives 404 like the other monitor pages
// (round 58 answer 7). The path is relative to the Translator data folder. No path shows the folder list of the data folder.
export default async function JsonPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireMonitor();
  const q = await searchParams;
  const raw = Array.isArray(q.path) ? q.path[0] : q.path;
  const v = await loadJsonView(raw);
  // Unit VW96 (card P31.3), default D4 of Q-A 3:20.3: one plain line above the path, and a plain line for each entry of a folder.
  // A refused path gets no line (the page shows the refusal).
  const entries = v.view === "folder" ? v.entries.map((e) => ({ path: e.path, folder: e.folder })) : [];
  const lines = v.view === "refused" ? null : await loadPlainLines(v.path, v.view === "folder", entries);
  const reports = v.view === "folder" && v.reports ? await readableReports(v.reports) : null;
  return (
    <section data-json-view={v.view}>
      <h1 className="text-xl font-semibold">JSON viewer</h1>
      {lines ? (
        <p data-json-plain-line className="mt-1 text-sm">
          {lines.line}
        </p>
      ) : null}
      <PathLine rel={v.path} />
      <Body v={v.view === "folder" ? { ...v, reports } : v} lines={lines?.entries ?? {}} />
    </section>
  );
}

/** The label "Reference critiques of 066e72da/p001" has a bare page ID. The plain line of its path names the article and the page. */
async function readableReports(reports: NonNullable<Extract<Awaited<ReturnType<typeof loadJsonView>>, { view: "folder" }>["reports"]>) {
  const refs = reports.filter((r) => r.label.startsWith("Reference critiques of "));
  const lines = (await loadPlainLines("", false, refs.map((r) => ({ path: r.path, folder: false })))).entries;
  return reports.map((r) => (lines[r.path] ? { ...r, label: lines[r.path] } : r));
}

function PathLine({ rel }: { rel: string }) {
  const parts = rel ? pathParts(rel) : [];
  return (
    <nav aria-label="Path" data-json-path className="mt-1 mb-4 font-mono text-sm break-all">
      <Link href="/json" className="text-accent underline-offset-2 hover:underline">
        data
      </Link>
      {parts.map((p, i) => (
        <span key={p.path}>
          <span className="text-muted"> / </span>
          {i === parts.length - 1 ? (
            <span aria-current="page">{p.name}</span>
          ) : (
            <Link href={jsonViewHref(p.path)} className="text-accent underline-offset-2 hover:underline">
              {p.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p data-json-message className="rounded border border-line bg-white p-4 text-sm">
      {children}
    </p>
  );
}

function Body({ v, lines }: { v: Awaited<ReturnType<typeof loadJsonView>>; lines: Record<string, string> }) {
  switch (v.view) {
    case "folder":
      return <JsonFolderList path={v.path} entries={v.entries} total={v.total} reports={v.reports} lines={lines} />;
    case "file":
      return <JsonViewer path={v.path} kind={v.kind} size={sizeMb(v.bytes)} text={v.text} />;
    case "big":
      return (
        <Note>
          The file {v.path} is {sizeMb(v.bytes)}. The JSON viewer opens files up to {sizeMb(MAX_VIEW_BYTES)}.{" "}
          <a href={`/api/file?path=${encodeURIComponent(v.path)}`} className="text-accent underline underline-offset-2">
            Open the plain text
          </a>
        </Note>
      );
    case "type":
      return (
        <Note>
          The JSON viewer cannot open {v.path}. It opens .json, .jsonl and .txt files and the prompt file current.{" "}
          <Link href={jsonViewHref(parentOf(v.path))} className="text-accent underline underline-offset-2">
            Back to the folder
          </Link>
        </Note>
      );
    case "missing":
      return (
        <Note>
          No file or folder {v.path} exists in the Translator data folder.{" "}
          <Link href="/json" className="text-accent underline underline-offset-2">
            Back to the data folder
          </Link>
        </Note>
      );
    case "refused":
      return (
        <p data-json-message className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The JSON viewer refused the path {JSON.stringify(v.path)}. Cause: {v.cause} It opens paths inside the Translator data folder only.
        </p>
      );
  }
}
