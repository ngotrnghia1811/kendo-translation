"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { moved, oneDecimal, type MapPoint } from "@/lib/vector-map-rules";
import { biggestMoves, crowdedCorner, filterPoints, hoverText, previousOf, valuesOf, zoomBox } from "@/lib/vector-map-detail";

export type Axes = "program" | "model";
export type PointFilter = "all" | "moved" | "new";
type Bounds = { x0: number; x1: number; y0: number; y1: number };
type Position = { x: number; y: number };

/** Keep the VW106 whole-box scale until the owner zooms. */
export function axisTop(max: number): number {
  for (const s of [2, 4, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]) if (max <= s) return s;
  return Math.ceil(max / 10) * 10;
}
export function xy(p: MapPoint, axes: Axes): { comp: number; imp: number } | null {
  const v = valuesOf(p, axes);
  return v ? { comp: v.comp, imp: v.imp } : null;
}
const signed = (v: number) => `${v >= 0 ? "+" : ""}${oneDecimal(v)}`;

export default function VectorMapChart({ points, removed = [], axes, top, selected, hrefs = {}, hrefOf, prevVersion, details }: {
  points: MapPoint[];
  removed?: MapPoint[];
  axes: Axes;
  top: { comp: number; imp: number };
  selected: string | null;
  hrefs?: Record<string, string>;
  // The pure markup test supplies this function. Server components pass serializable hrefs instead.
  hrefOf?: (id: string) => string;
  prevVersion: string | null;
  details?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);
  const [filter, setFilter] = useState<PointFilter>("all");
  const [zoom, setZoom] = useState<Bounds | null>(null);
  const [drag, setDrag] = useState<{ start: Position; end: Position } | null>(null);
  const [tip, setTip] = useState<{ p: MapPoint; removed: boolean } | null>(null);
  const marker = useId().replace(/:/g, "");
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const full = { x0: 0, x1: axisTop(top.comp), y0: 0, y1: axisTop(top.imp) };
  const bounds = zoom ?? full;
  const H = width < 600 ? 330 : 430;
  const pad = { left: 42, top: 15, right: 18, bottom: 30 };
  const plotW = width - pad.left - pad.right, plotH = H - pad.top - pad.bottom;
  const sx = (v: number) => pad.left + (v - bounds.x0) / (bounds.x1 - bounds.x0) * plotW;
  const sy = (v: number) => H - pad.bottom - (v - bounds.y0) / (bounds.y1 - bounds.y0) * plotH;
  const inside = (v: { comp: number; imp: number }) => v.comp >= bounds.x0 && v.comp <= bounds.x1 && v.imp >= bounds.y0 && v.imp <= bounds.y1;
  const visible = filterPoints(points, filter, axes);
  const shown = visible.filter((p) => inside(valuesOf(p, axes)!));
  const moves = biggestMoves(points, axes);
  const href = (id: string) => hrefOf ? hrefOf(id) : hrefs[id];
  const position = (e: PointerEvent<SVGSVGElement>): Position => {
    const b = e.currentTarget.getBoundingClientRect();
    return { x: Math.max(pad.left, Math.min(width - pad.right, (e.clientX - b.left) * width / b.width)), y: Math.max(pad.top, Math.min(H - pad.bottom, (e.clientY - b.top) * H / b.height)) };
  };
  function endDrag(e: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const end = position(e);
    const next = zoomBox(drag.start, end, { left: pad.left, top: pad.top, width: plotW, height: plotH }, bounds);
    if (next) setZoom(next);
    setDrag(null);
  }
  const label = axes === "program" ? "program counts" : "model score";
  return (
    <div className={details ? "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : "min-w-0"}>
      <div className="min-w-0">
        <ul data-vm-legend className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <li><span className="mr-1 text-muted" aria-hidden="true">●</span> Gray dot: no change</li>
          <li><span className="mr-1 text-bar-run" aria-hidden="true">➜</span> Blue arrow: soft move</li>
          <li><span className="mr-1 text-bar-ok" aria-hidden="true">◎</span> Green ring: new point (hard add)</li>
          <li><span className="mr-1 text-red-700" aria-hidden="true">✕</span> Red cross: removed point</li>
        </ul>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div role="group" aria-label="Filter points" className="flex flex-wrap gap-1">
            {([['all', 'all'], ['moved', 'moved only'], ['new', 'new only']] as const).map(([key, text]) => <button key={key} type="button" data-vm-filter={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setTip(null); }} className={`rounded border border-line px-3 py-1.5 ${filter === key ? 'bg-tab-on font-semibold text-tab-on-ink' : ''}`}>{text}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-vm-crowded onClick={() => { setZoom(crowdedCorner(points, axes, full)); setTip(null); }} className="rounded border border-line px-3 py-1.5 text-button2-ink">Zoom to the crowded corner</button>
            <button type="button" data-vm-show-all onClick={() => { setZoom(null); setTip(null); }} className="rounded border border-line px-3 py-1.5">Show all</button>
          </div>
        </div>
        <p className="mb-1 text-sm font-semibold">More emphasis (importance, % of the prompt) ↑</p>
        <div ref={host} className="relative min-w-0">
          <svg ref={svg} data-vm-chart aria-label={`Scatter chart of ${shown.length} points, ${label}. Across: comprehensiveness in percent. Up: importance in percent.`} data-vm-zoom={zoom ? "zoomed" : "all"} viewBox={`0 0 ${width} ${H}`} width="100%" role="group" className="block w-full select-none rounded border border-line bg-white" style={{ touchAction: 'pan-y' }}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('a')) return;
              const p = position(e);
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ start: p, end: p });
              setTip(null);
            }}
            onPointerMove={(e) => { if (drag) setDrag({ ...drag, end: position(e) }); }}
            onPointerUp={endDrag} onPointerCancel={() => setDrag(null)}>
            <title>Comprehensiveness (% of the prompt) across. Importance (% of the prompt) up.</title>
            <defs>
              <marker id={`${marker}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bar-run)" /></marker>
              <clipPath id={`${marker}-plot`}><rect x={pad.left - 10} y={pad.top - 10} width={plotW + 20} height={plotH + 20} /></clipPath>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const x = bounds.x0 + f * (bounds.x1 - bounds.x0), y = bounds.y0 + f * (bounds.y1 - bounds.y0);
              return <g key={f}>
                <line x1={sx(x)} x2={sx(x)} y1={pad.top} y2={H - pad.bottom} stroke="var(--line)" />
                <text x={sx(x)} y={H - 9} textAnchor="middle" fontSize="12" fill="var(--muted)">{oneDecimal(x)}</text>
                <line x1={pad.left} x2={width - pad.right} y1={sy(y)} y2={sy(y)} stroke="var(--line)" />
                <text x={pad.left - 8} y={sy(y) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{oneDecimal(y)}</text>
              </g>;
            })}
            <g clipPath={`url(#${marker}-plot)`}>
              {visible.map((p) => {
                const v = valuesOf(p, axes)!, pv = previousOf(p, axes);
                return pv && moved(v, pv) ? <line key={p.id} data-vm-arrow={p.num} x1={sx(pv.comp)} y1={sy(pv.imp)} x2={sx(v.comp)} y2={sy(v.imp)} stroke="var(--bar-run)" strokeWidth="1.5" markerEnd={`url(#${marker}-arrow)`} /> : null;
              })}
              {shown.map((p) => {
                const v = valuesOf(p, axes)!, pv = previousOf(p, axes), on = p.id === selected;
                const move = pv ? ` Move since ${prevVersion}: comprehensiveness ${signed(v.comp - pv.comp)} pp, importance ${signed(v.imp - pv.imp)} pp.` : ' No previous values.';
                const text = `Point ${p.num}: ${hoverText(p.text)}. Comprehensiveness ${oneDecimal(v.comp)} %, importance ${oneDecimal(v.imp)} %.${move}`;
                return <a key={p.id} href={href(p.id)} data-vm-dot={p.num} data-vm-added={p.added ? '1' : undefined} aria-label={`Point ${p.num}`} onMouseEnter={() => setTip({ p, removed: false })} onMouseLeave={() => setTip(null)} onFocus={() => setTip({ p, removed: false })} onBlur={() => setTip(null)}>
                  <title>{text}</title>
                  <circle cx={sx(v.comp)} cy={sy(v.imp)} r="10" fill="transparent" />
                  {p.added ? <circle data-vm-ring={p.num} cx={sx(v.comp)} cy={sy(v.imp)} r="9" fill="none" stroke="var(--bar-ok)" strokeWidth="2.5" /> : null}
                  <circle cx={sx(v.comp)} cy={sy(v.imp)} r={on ? 6 : 4} fill={on ? 'var(--title)' : 'var(--muted)'} stroke={on ? 'var(--foreground)' : 'none'} strokeWidth="2" fillOpacity={on ? 1 : 0.8} />
                  {on || p.added ? <text x={sx(v.comp) + 11} y={sy(v.imp) - 8} fontSize="12" fontWeight="600" fill="var(--foreground)">{p.num}</text> : null}
                </a>;
              })}
              {filter === 'all' ? removed.map((p) => {
                const v = valuesOf(p, axes);
                return v && inside(v) ? <a key={p.id} href={href(p.id)} data-vm-cross={p.num} aria-label={`Removed point ${p.num}`} onMouseEnter={() => setTip({ p, removed: true })} onMouseLeave={() => setTip(null)} onFocus={() => setTip({ p, removed: true })} onBlur={() => setTip(null)}>
                  <title>{`Point ${p.num} removed in this prompt version.`}</title>
                  <circle cx={sx(v.comp)} cy={sy(v.imp)} r="10" fill="transparent" />
                  <path d={`M ${sx(v.comp)-5} ${sy(v.imp)-5} l 10 10 m 0 -10 l -10 10`} stroke="var(--color-red-700, #b91c1c)" strokeWidth="2.5" />
                </a> : null;
              }) : null}
            </g>
            {drag ? <rect data-vm-drag-box x={Math.min(drag.start.x, drag.end.x)} y={Math.min(drag.start.y, drag.end.y)} width={Math.abs(drag.end.x-drag.start.x)} height={Math.abs(drag.end.y-drag.start.y)} fill="var(--bar-run)" fillOpacity="0.12" stroke="var(--bar-run)" strokeDasharray="4 3" pointerEvents="none" /> : null}
          </svg>
          {tip ? <div role="tooltip" data-vm-hover className="pointer-events-none absolute top-3 right-3 left-12 z-10 max-w-sm rounded border border-line bg-background p-3 text-sm shadow-lg">
            <p className="font-semibold">Point {tip.p.num}{tip.removed ? ' · removed in this version' : tip.p.added ? ' · new point (hard add)' : ''}</p>
            <p data-vm-hover-text className="mt-1 break-words">{hoverText(tip.p.text)}</p>
            {(() => {
              const v = valuesOf(tip.p, axes)!, pv = previousOf(tip.p, axes);
              return <><p className="mt-2">Comprehensiveness {oneDecimal(v.comp)} % · importance {oneDecimal(v.imp)} %</p><p>{tip.removed ? 'Cross at the last stored values.' : pv ? `Move since ${prevVersion}: detail ${signed(v.comp-pv.comp)} pp, emphasis ${signed(v.imp-pv.imp)} pp.` : 'Move: no previous values.'}</p></>;
            })()}
          </div> : null}
        </div>
        <p className="mt-1 text-right text-sm font-semibold">More detail (comprehensiveness, % of the prompt) →</p>
        <p data-vm-zoom-status aria-live="polite" className="mt-2 text-xs text-muted">{shown.length} of {points.length} points in view. {zoom ? `Zoom: detail ${oneDecimal(bounds.x0)}–${oneDecimal(bounds.x1)} %, emphasis ${oneDecimal(bounds.y0)}–${oneDecimal(bounds.y1)} %.` : 'All values.'} Drag a box on the chart to zoom. An arrow needs a move of at least 0.1 percentage points.</p>
        <section data-vm-moves className="mt-5">
          <h2 className="mb-2 font-semibold">Biggest moves in this version</h2>
          <p className="mb-2 text-xs text-muted">Largest distance across both axes, in percentage points (pp). {prevVersion ? `Since ${prevVersion}.` : 'The first prompt version has no previous values.'}</p>
          {moves.length ? <ol className="grid gap-1 text-sm sm:grid-cols-2">{moves.map((m) => <li key={m.point.id}><a href={href(m.point.id)} data-vm-move-row={m.point.num} className={`block rounded border border-line px-3 py-2 hover:bg-state-run ${m.point.id === selected ? 'bg-state-run text-state-run-ink' : ''}`}><span className="font-semibold">Point {m.point.num}</span><span className="ml-2">{oneDecimal(m.distance)} pp</span><span className="block text-xs text-muted">Detail {signed(m.comp)} · emphasis {signed(m.imp)}</span></a></li>)}</ol> : <p className="text-sm text-muted">No move of 0.1 percentage points or more.</p>}
        </section>
      </div>
      {details ? <aside data-vm-side-details className="min-w-0 xl:border-l xl:border-line xl:pl-5">{details}</aside> : null}
    </div>
  );
}
