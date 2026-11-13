import type { RunDetail } from "@/lib/types";

// Unit VW99 (Q-A 3:27.4 "B, A plus colored bands"): a progress bar by meaning. The accepted part is green, the part that runs now is blue,
// and the waiting part is grey. The words next to the bar carry the same facts, so the color is never the only sign.

type BarProps = {
  /** The name of the bar for screen readers. */
  label: string;
  total: number;
  accepted: number;
  running?: number;
  /** The words of the bar, for example "53 translated, 1 translating now, 90 not started yet, of 144 pages". */
  text: string;
  className?: string;
};

export function ProgressBar({ label, total, accepted, running = 0, text, className = "h-2.5 w-full" }: BarProps) {
  const pct = (n: number) => (total > 0 ? Math.max(0, Math.min(100, (n / total) * 100)) : 0);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={accepted} aria-valuetext={text} title={text} className={`flex shrink-0 overflow-hidden rounded bg-bar-wait ${className}`}>
      <div data-bar-part="accepted" className="h-full bg-bar-ok" style={{ width: `${pct(accepted)}%` }} />
      {running > 0 ? <div data-bar-part="running" className="h-full bg-bar-run" style={{ width: `${pct(running)}%` }} /> : null}
    </div>
  );
}

/** The counts of the run view bar. Accepted: pages that this list translated, plus pages that an earlier list of the same run accepted. */
export function runProgress(pages: RunDetail["pages"]): { total: number; accepted: number; running: number; text: string } {
  const total = pages.length;
  const accepted = pages.filter((p) => p.state === "done" || p.acceptedBefore).length;
  const running = pages.filter((p) => p.state === "running").length;
  const failed = pages.filter((p) => p.state === "failed" || p.state === "interrupted").length;
  const waiting = total - accepted - running - failed;
  const parts = [`${accepted} translated`];
  if (running > 0) parts.push(`${running} translating now`);
  if (waiting > 0) parts.push(`${waiting} not started yet`);
  if (failed > 0) parts.push(`${failed} failed or interrupted`);
  return { total, accepted, running, text: `${parts.join(", ")}, of ${total} ${total === 1 ? "page" : "pages"}` };
}

/** The bar of the run view /runs/<stamp>, with its words below the title. */
export function RunProgress({ pages }: { pages: RunDetail["pages"] }) {
  const p = runProgress(pages);
  if (p.total === 0) return null;
  return (
    <div data-run-progress className="mb-4 max-w-2xl">
      <ProgressBar label="Pages of this list" total={p.total} accepted={p.accepted} running={p.running} text={p.text} />
      <p className="mt-1 text-sm">{p.text}</p>
    </div>
  );
}
