import Link from "next/link";
import { requireMonitor } from "@/lib/monitor";
import { loadJsonView } from "@/lib/json-view-load";
import { jsonViewHref, parentOf, pathParts, sizeMb, MAX_VIEW_BYTES } from "@/lib/json-view";
import JsonFolderList from "@/components/JsonFolderList";
import JsonViewer from "@/components/JsonViewer";

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
  return (
    <section data-json-view={v.view}>
      <h1 className="text-xl font-semibold">JSON viewer</h1>
      <PathLine rel={v.path} />
      <Body v={v} />
    </section>
  );
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

function Body({ v }: { v: Awaited<ReturnType<typeof loadJsonView>> }) {
  switch (v.view) {
    case "folder":
      return <JsonFolderList path={v.path} entries={v.entries} total={v.total} reports={v.reports} />;
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
