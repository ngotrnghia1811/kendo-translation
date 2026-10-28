import Link from "next/link";
import type { HtvPageRow } from "@/lib/htv-types";
import { VerdictPill } from "./Pills";

// Round 51 answer 13 (Q-A 2026-10-28 l58): "All finished pages (Recommended)". FAIL pages are in the list.
export default function HtvList({ rows }: { rows: HtvPageRow[] }) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Pages for human translation</h1>
      <p className="mt-1 text-sm text-muted">{rows.length} pages with a finished run. A page shows its newest finished run, or the run that the admin marked.</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-1.5 pr-4">Page</th>
            <th className="pr-4">Book</th>
            <th className="pr-4">QA_3 verdict</th>
            <th className="pr-4">Shown run</th>
            <th className="pr-4">Finished runs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pageId} className="border-b border-line/60" data-page={r.pageId}>
              <td className="py-1.5 pr-4">
                <Link href={`/translate/${encodeURIComponent(r.slug)}/${encodeURIComponent(r.page)}`} className="font-medium text-accent underline">
                  {r.pageId}
                </Link>
              </td>
              <td className="pr-4">{r.bookTitle || <span className="text-muted">–</span>}</td>
              <td className="pr-4">
                <VerdictPill verdict={r.verdict} score={r.score} />
              </td>
              <td className="pr-4 font-mono text-xs">
                {r.shownRunId}
                {r.marked ? <span className="ml-2 rounded bg-sky-100 px-1.5 font-sans text-sky-800">marked</span> : null}
              </td>
              <td className="pr-4">{r.runCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
