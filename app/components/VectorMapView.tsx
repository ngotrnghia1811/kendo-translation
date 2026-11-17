import { BoxCode } from "./BoxCode";
import VectorMapChart, { type Axes } from "./VectorMapChart";
import VectorMapSlider from "./VectorMapSlider";
import { pstTime } from "@/lib/htv-pst";
import { BOX_TYPES, moved, oneDecimal, pointBody, pointHistory, type BoxMap, type PointStep } from "@/lib/vector-map-rules";

// Unit VW106: the vector map screen /monitor/vector-map on the Monitor dashboard on this Mac (Q-A 3:64.5 row 3).
// Everything is a link with the state in the address (?box=&v=&axes=&p=), so the server renders each view and the client part is the slider only.

export const VM_PATH = "/monitor/vector-map";

export interface VmState {
  box: string;
  version: string | null;
  axes: Axes;
  point: string | null;
}

export function vmHref(s: VmState): string {
  const q = new URLSearchParams({ box: s.box });
  if (s.version) q.set("v", s.version);
  if (s.axes === "model") q.set("axes", "model");
  if (s.point) q.set("p", s.point);
  return `${VM_PATH}?${q.toString()}`;
}

const KIND_TEXT: Record<PointStep["kind"], string> = {
  first: "first version",
  added: "new point (hard add)",
  changed: "text changed",
  moved: "same text, values moved",
  same: "same text, same values",
};

const pct = (v: number) => `${oneDecimal(v)} %`;

function PointDetails({ map, id }: { map: BoxMap; id: string }) {
  const { steps, removedIn } = pointHistory(map, id);
  if (steps.length === 0) return null;
  const last = steps[steps.length - 1];
  return (
    <section data-vm-details aria-labelledby="vm-details-h" className="mt-6">
      <h2 id="vm-details-h" className="section-band mb-2 text-lg font-semibold">
        Point {last.num} of <BoxCode code={map.box} /> in each prompt version
      </h2>
      {removedIn ? (
        <p data-vm-removed-in className="mb-2 text-sm">
          This point is not in {removedIn} and later versions (removed).
        </p>
      ) : null}
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const sameText = i > 0 && pointBody(steps[i - 1].text) === pointBody(s.text);
          return (
            <li key={s.version} data-vm-step={s.version} data-vm-kind={s.kind} className="rounded border border-line bg-white px-3 py-2 text-sm">
              <p className="font-semibold">
                <span className="font-mono">{s.version}</span> · point {s.num} · {KIND_TEXT[s.kind]}
              </p>
              <p className="text-muted">
                Program counts: comprehensiveness {pct(s.comp)}, importance {pct(s.imp)}.{" "}
                {s.model ? `Model score: comprehensiveness ${pct(s.model.comp)}, importance ${pct(s.model.imp)}.` : "Model score: Not measured."}
              </p>
              {sameText ? (
                <p className="text-muted">Same text as {steps[i - 1].version}.</p>
              ) : (
                <p data-vm-text className="mt-1 break-words whitespace-pre-wrap">
                  {s.text}
                </p>
              )}
              {s.kind === "added" || s.kind === "changed" ? (
                <div data-vm-groups className="mt-2">
                  <p className="text-muted">
                    Critique groups of this prompt version: {s.groupCount} groups, {s.critiqueCount} critiques.
                    {s.marks.length === 0 ? " The audit gave no marks." : ""}
                  </p>
                  {s.marks.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {s.marks.map((m, k) => (
                        <li key={`${m.group_id}-${k}`} data-vm-mark={m.mark}>
                          <span className="font-mono">{m.group_id}</span>{" "}
                          <span className={`rounded px-1 ${m.mark === "hard" ? "bg-state-stop text-state-stop-ink" : "bg-state-run text-state-run-ink"}`}>{m.mark}</span>
                          {m.covering_quote ? <span className="break-words"> · covering quote: “{m.covering_quote}”</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function VectorMapView({ map, counts, state }: { map: BoxMap; counts: Record<string, number>; state: VmState }) {
  const versions = map.versions.map((v) => v.version);
  const idx = state.version && versions.includes(state.version) ? versions.indexOf(state.version) : versions.length - 1;
  const cur = idx >= 0 ? map.versions[idx] : null;
  const prev = idx > 0 ? map.versions[idx - 1] : null;
  const axes: Axes = state.axes === "model" && cur?.measured ? "model" : "program";
  const here = (over: Partial<VmState>) => vmHref({ box: map.box, version: cur?.version ?? null, axes, point: state.point, ...over });
  const top = axes === "program" ? { comp: map.max.comp, imp: map.max.imp } : { comp: map.max.modelComp, imp: map.max.modelImp };
  const pts = cur?.points ?? [];
  const added = pts.filter((p) => p.added).length;
  const movedCount = pts.filter((p) => {
    const v = axes === "program" ? p : p.model;
    const pv = axes === "program" ? p.prev : p.modelPrev;
    return v && moved(v, pv);
  }).length;
  return (
    <div data-vm-view data-vm-box={map.box}>
      <nav aria-label="Box type" data-vm-boxes className="mb-3 flex flex-wrap gap-1.5 text-sm">
        {BOX_TYPES.map((b) => (
          <a
            key={b}
            href={vmHref({ box: b, version: null, axes: "program", point: null })}
            aria-current={b === map.box ? "page" : undefined}
            data-vm-box-link={b}
            className={`rounded border px-2 py-0.5 ${b === map.box ? "border-foreground font-semibold" : "border-line"}`}
          >
            <BoxCode code={b} /> <span className="text-muted">{counts[b] ?? 0}</span>
          </a>
        ))}
      </nav>
      {!cur ? (
        <p data-vm-empty className="text-sm text-muted">
          No stored prompt version of box type {map.box} yet.
        </p>
      ) : (
        <>
          <VectorMapSlider key={`${map.box}-${idx}`} versions={versions} index={idx} hrefs={versions.map((v) => here({ version: v }))} />
          <p data-vm-version-line className="mt-1 text-sm text-muted">
            {cur.created_utc ? `Written ${pstTime(cur.created_utc) || cur.created_utc}. ` : ""}
            {cur.update_point ? `Update point after page ${cur.update_point}. ` : "The first prompt version. "}
            {prev ? `${cur.groupCount} critique groups, ${cur.critiqueCount} critiques. ` : ""}
            {cur.chars.toLocaleString("en-US")} characters, {pts.length} points.
          </p>
          {map.fallback ? (
            <p data-vm-fallback className="text-sm text-muted">
              The parent chain of the prompt versions is broken. The order is the sort of the version labels.
            </p>
          ) : null}
          <div role="group" aria-label="Axes" data-vm-axes className="mt-3 inline-flex flex-wrap overflow-hidden rounded border border-line text-sm">
            <a href={here({ axes: "program" })} aria-current={axes === "program" ? "true" : undefined} className={`px-2.5 py-1 ${axes === "program" ? "bg-tab-on font-semibold text-tab-on-ink" : ""}`}>
              Program counts
            </a>
            {cur.measured ? (
              <a href={here({ axes: "model" })} aria-current={axes === "model" ? "true" : undefined} className={`px-2.5 py-1 ${axes === "model" ? "bg-tab-on font-semibold text-tab-on-ink" : ""}`}>
                Model score
              </a>
            ) : (
              <span data-vm-not-measured className="px-2.5 py-1 text-muted">
                Model score: Not measured
              </span>
            )}
          </div>
          <p data-vm-counts className="mt-2 text-sm">
            {pts.length} points · {added} new (hard add) · {movedCount} moved {prev ? `since ${prev.version}` : ""} · {cur.removed.length} removed
          </p>
          <ul data-vm-legend className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li>
              <svg width="14" height="14" aria-hidden="true" className="mr-1 inline align-[-2px]">
                <circle cx="7" cy="7" r="4.5" style={{ fill: "var(--muted)" }} />
              </svg>
              point
            </li>
            <li>
              <svg width="20" height="20" aria-hidden="true" className="mr-1 inline align-[-5px]">
                <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" style={{ stroke: "var(--bar-ok)" }} />
                <circle cx="10" cy="10" r="4" style={{ fill: "var(--muted)" }} />
              </svg>
              ring: new point (hard add)
            </li>
            <li>
              <svg width="24" height="12" aria-hidden="true" className="mr-1 inline">
                <line x1="1" y1="6" x2="18" y2="6" strokeWidth="2" style={{ stroke: "var(--bar-run)" }} />
                <path d="M 17 2 L 23 6 L 17 10 z" style={{ fill: "var(--bar-run)" }} />
              </svg>
              arrow: soft move from the last version (0.1 percentage points or more)
            </li>
          </ul>
          <div className="mt-2 max-w-3xl">
            <VectorMapChart points={pts} axes={axes} top={top} selected={state.point} hrefOf={(id) => here({ point: id })} prevVersion={prev?.version ?? null} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Program counts: comprehensiveness is the share of the prompt characters in the point. Importance is the share of the emphasis marks: citations by other points and the words must, never, always, only, do not, every.
          </p>
          {cur.removed.length > 0 ? (
            <section data-vm-removed className="mt-4 text-sm">
              <h2 className="mb-1 font-semibold">Points removed since {prev?.version}</h2>
              <ul className="space-y-1">
                {cur.removed.map((r) => (
                  <li key={r.id} data-vm-removed-point={r.num} className="break-words">
                    <a href={here({ point: r.id })} className="underline underline-offset-2">
                      Point {r.num}
                    </a>
                    : {r.text.slice(0, 200)}
                    {r.text.length > 200 ? " …" : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <details data-vm-list className="mt-4 text-sm">
            <summary className="cursor-pointer">All {pts.length} points of this prompt version</summary>
            <ul className="mt-1 space-y-0.5">
              {pts.map((p) => {
                const v = axes === "program" ? p : p.model;
                return (
                  <li key={p.id} className="break-words">
                    <a href={here({ point: p.id })} className="underline underline-offset-2">
                      Point {p.num}
                    </a>{" "}
                    {v ? `comprehensiveness ${pct(v.comp)}, importance ${pct(v.imp)}` : "Not measured"}
                    {p.added ? " · new point (hard add)" : ""}
                  </li>
                );
              })}
            </ul>
          </details>
          {state.point ? <PointDetails map={map} id={state.point} /> : null}
        </>
      )}
    </div>
  );
}
