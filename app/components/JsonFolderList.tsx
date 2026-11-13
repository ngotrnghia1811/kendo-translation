import Link from "next/link";
import { jsonViewHref, parentOf, sizeMb, type FolderEntry } from "@/lib/json-view";
import type { ReportItem } from "@/lib/json-view-load";

// Unit VW89 (round 90), Q-A 3:1.7 item 4 "Folder list, reports first": /json with no path shows the folders of the Translator data folder.
// A click on a folder shows its entries. A click on a file opens it. The phase 2 report files come first when they exist.
// Server component: no open and close state here.
// Unit VW96 (card P31.3), default D4 of Q-A 3:20.3: `lines` holds a plain line for each entry path (lib/json-view-lines.ts), shown in small grey text under the name.
export default function JsonFolderList({ path, entries, total, reports, lines = {} }: { path: string; entries: FolderEntry[]; total: number; reports: ReportItem[] | null; lines?: Record<string, string> }) {
  return (
    <div className="space-y-6">
      {reports ? (
        <section data-json-reports>
          <h2 className="section-band mb-2 text-lg font-semibold">Phase 2 report</h2>
          {reports.length === 0 ? (
            <p data-no-report className="text-sm text-muted">
              No phase 2 report yet.
            </p>
          ) : (
            <ul className="rounded border border-line bg-white">
              {reports.map((r) => (
                <li key={r.path} className="border-t border-line px-3 py-2 first:border-t-0">
                  <Link href={jsonViewHref(r.path)} data-report-link className="text-accent underline-offset-2 hover:underline">
                    {r.label}
                  </Link>{" "}
                  <span className="font-mono text-xs text-muted break-all">{r.path}{r.folder ? "/" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section data-json-folder>
        <h2 className="section-band mb-2 text-lg font-semibold">{path ? "Folder" : "Translator data folder"}</h2>
        {path ? (
          <p className="mb-2 text-sm">
            <Link href={jsonViewHref(parentOf(path))} data-up-link className="text-accent underline-offset-2 hover:underline">
              ↑ Up one folder
            </Link>
          </p>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-muted">This folder is empty.</p>
        ) : (
          <ul className="rounded border border-line bg-white font-mono text-sm">
            {entries.map((e) => (
              <li key={e.path} data-entry={e.folder ? "folder" : e.kind ? "file" : "other"} className="flex flex-wrap items-baseline gap-x-4 border-t border-line px-3 py-1.5 first:border-t-0">
                {e.folder || e.kind ? (
                  <Link href={jsonViewHref(e.path)} className="min-w-0 flex-1 break-all text-accent underline-offset-2 hover:underline">
                    {e.name}
                    {e.folder ? "/" : ""}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 break-all text-muted" title="The JSON viewer cannot open this file type">
                    {e.name}
                  </span>
                )}
                <span className="text-xs text-muted tabular-nums">{e.folder ? "folder" : e.bytes === null ? "" : sizeMb(e.bytes)}</span>
                {lines[e.path] ? (
                  <span data-entry-line className="basis-full font-sans text-xs text-muted">
                    {lines[e.path]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {total > entries.length ? (
          <p className="mt-2 text-sm text-muted">
            The list shows the first {entries.length} of {total} entries.
          </p>
        ) : null}
      </section>
    </div>
  );
}
