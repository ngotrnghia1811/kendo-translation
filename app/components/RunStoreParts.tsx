import { BoxCode } from "./BoxCode";
import { RawId } from "./Named";
import { pstDateTime } from "@/lib/pst";
import { FROZEN_HELP, OVERFLOW_HELP, bookPageText, overflowCountText, overflowStartText, type BookWatch, type FrozenBox, type OverflowRow } from "@/lib/run-store";

// Unit VW85 (round 91), Q-A 3:26.3 "Book runs, frozen boxes, overflow".
//   (b) "A frozen box shows "Frozen since page n" in the step view, in the training monitor header, and in the Details view."
//   (c) "The Details view shows the overflow count. The training monitor of the start box lists each overflow critique with its content and its start point."
// Each part is one self-contained component with its own data-* marker, so that a later unit (VW99, tabs) can move it without a rewrite.
// Box codes stay on the screen with the readable name on hover (Q-A 3:18.5 "Keep codes, explain on hover", components/BoxCode.tsx).
// No server-only import: the step view, the training monitor (client) and the Details view (client) use these parts.

/** One frozen box: "TL_2 Frozen since page 12", with the page of the update point and the K = 3 pages on hover. */
export function FrozenLine({ f, title }: { f: FrozenBox; title?: string | null }) {
  const pages = f.pages.length ? ` The 3 pages without a hard critique group: ${f.pages.join(", ")}.` : "";
  return (
    <span data-frozen-box={f.box} className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="font-mono">
        <BoxCode code={f.box} />
      </span>
      <span title={`${FROZEN_HELP}${pages}`} className="font-semibold">
        {f.text}
      </span>
      {f.page ? <RawId title={f.page}>{bookPageText(f.page, title ?? null)}</RawId> : null}
      {f.epoch !== null ? <span className="text-xs text-muted">{pstDateTime(f.epoch)}</span> : null}
    </span>
  );
}

/** Step view part: the frozen boxes of the run. `book` true shows the empty sentence too; phase 2 (no freeze) shows nothing. */
export function FrozenBoxes({ frozen, title, book }: { frozen: FrozenBox[] | undefined; title?: string | null; book: boolean }) {
  if (!book) return null;
  const list = frozen ?? [];
  return (
    <section data-frozen-boxes className="mt-3 rounded border border-line bg-white p-3 text-sm">
      <h3 className="text-sm font-semibold" title={FROZEN_HELP}>
        Frozen boxes ({list.length})
      </h3>
      {list.length ? (
        <ul className="mt-1 space-y-1">
          {list.map((f) => (
            <li key={f.box}>
              <FrozenLine f={f} title={title} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted">No box of this run is frozen. Only phase 4 freezes boxes.</p>
      )}
    </section>
  );
}

/** Training monitor part: the overflow critiques that started at this box, with their content and their start point. */
export function OverflowList({ box, rows, title }: { box: string; rows: OverflowRow[] | undefined; title?: string | null }) {
  const list = rows ?? [];
  return (
    <section data-overflow-list={box} className="mt-3 rounded border border-line bg-white p-3 text-sm">
      <h3 className="text-sm font-semibold" title={OVERFLOW_HELP}>
        Overflow critiques that started at <BoxCode code={box} /> ({list.length})
      </h3>
      {list.length ? (
        <ol className="mt-1 space-y-2">
          {list.map((r) => (
            <li key={r.queueId} data-overflow-row={r.queueId} className="border-t border-line pt-1">
              <p>
                <span className="text-xs text-muted">Start point: </span>
                {overflowStartText(r, title ?? null)}
              </p>
              {r.failureMode ? (
                <p className="break-words">
                  <span className="text-xs text-muted">Failure mode: </span>
                  {r.failureMode}
                </p>
              ) : null}
              {r.reason ? (
                <p className="break-words">
                  <span className="text-xs text-muted">Reason: </span>
                  {r.reason}
                </p>
              ) : null}
              {r.evidence ? (
                <p className="break-words">
                  <span className="text-xs text-muted">Evidence: </span>
                  {r.evidence}
                </p>
              ) : null}
              {r.noteForNextStep ? (
                <p className="break-words">
                  <span className="text-xs text-muted">Note for the next step: </span>
                  {r.noteForNextStep}
                </p>
              ) : null}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted">Show the full record</summary>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-stone-50 p-2">{JSON.stringify(r.content, null, 2)}</pre>
              </details>
              <RawId title="queue_id of the critique (critiques/overflow.jsonl)">{r.queueId}</RawId>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-muted">No overflow critique started at this box. Only phase 4 records overflow critiques.</p>
      )}
    </section>
  );
}

/** Details view part: links to the step view and the training monitor of the book run, the frozen boxes and the overflow count. */
export function BookRunWatch({ watch, title }: { watch: BookWatch; title?: string | null }) {
  return (
    <div data-book-watch className="space-y-2 text-sm">
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a data-book-steps-link href={watch.stepsHref} className="text-blue-800 underline">
          Steps
        </a>
        {watch.monitorHref ? (
          <a data-book-monitor-link href={watch.monitorHref} className="text-blue-800 underline">
            Training monitor
          </a>
        ) : (
          <span className="text-muted">Training monitor: no list of this book yet</span>
        )}
        {watch.monitorStamp ? <RawId title="list of the current run (status.json list_stamp, else the newest list)">{watch.monitorStamp}</RawId> : null}
      </p>
      <div data-book-frozen>
        <span className="text-xs text-muted" title={FROZEN_HELP}>
          Frozen boxes ({watch.frozen.length}):{" "}
        </span>
        {watch.frozen.length ? (
          <ul className="space-y-1">
            {watch.frozen.map((f) => (
              <li key={f.box}>
                <FrozenLine f={f} title={title} />
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">none in the current run</span>
        )}
      </div>
      <p data-book-overflow>
        <span className="text-xs text-muted" title={OVERFLOW_HELP}>
          Overflow:{" "}
        </span>
        <span data-book-overflow-count={watch.overflow.count}>{overflowCountText(watch.overflow.count)}</span>
        {watch.overflow.byBox.length ? (
          <span className="text-muted">
            {" "}
            (start box:{" "}
            {watch.overflow.byBox.map((b, i) => (
              <span key={b.box}>
                {i ? ", " : ""}
                <BoxCode code={b.box} /> {b.n}
              </span>
            ))}
            )
          </span>
        ) : null}
      </p>
    </div>
  );
}
