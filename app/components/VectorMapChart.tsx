import { moved, oneDecimal, type MapPoint } from "@/lib/vector-map-rules";

// Unit VW106, Q-A 3:64.5 row 3: "A scatter chart: across = comprehensiveness, up = importance, one dot for each point."
// "An arrow shows a soft move from the last version. A ring marks a new point (hard add)." A click on a dot opens the click details (a link).
// Plain SVG, no chart package. Colors are theme variables of app/globals.css, so every theme works:
//   dot --muted, arrow --bar-run (the blue of VW99), ring of a new point --bar-ok (the green of VW99), chosen point --title.

export type Axes = "program" | "model";

const W = 640;
const H = 420;
const PAD = { left: 52, right: 16, top: 16, bottom: 48 };

/** A round upper end for an axis: 2, 4, 5, 10, 15, 20, ... percent. */
export function axisTop(max: number): number {
  for (const s of [2, 4, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]) if (max <= s) return s;
  return Math.ceil(max / 10) * 10;
}

/** The values of a point on the chosen axes, or null (no model score). */
export function xy(p: MapPoint, axes: Axes): { comp: number; imp: number } | null {
  return axes === "program" ? { comp: p.comp, imp: p.imp } : p.model;
}

function prevXy(p: MapPoint, axes: Axes): { comp: number; imp: number } | null {
  return axes === "program" ? p.prev : p.modelPrev;
}

export default function VectorMapChart({
  points,
  axes,
  top,
  selected,
  hrefOf,
  prevVersion,
}: {
  points: MapPoint[];
  axes: Axes;
  top: { comp: number; imp: number };
  selected: string | null;
  hrefOf: (id: string) => string;
  prevVersion: string | null;
}) {
  const xTop = axisTop(top.comp);
  const yTop = axisTop(top.imp);
  const sx = (v: number) => PAD.left + (v / xTop) * (W - PAD.left - PAD.right);
  const sy = (v: number) => H - PAD.bottom - (v / yTop) * (H - PAD.top - PAD.bottom);
  const ticks = (t: number) => [0, 0.25, 0.5, 0.75, 1].map((f) => f * t);
  const shown = points.map((p) => ({ p, v: xy(p, axes), pv: prevXy(p, axes) })).filter((x): x is { p: MapPoint; v: { comp: number; imp: number }; pv: { comp: number; imp: number } | null } => x.v !== null);
  const label = axes === "program" ? "program counts" : "model score";
  return (
    <svg
      data-vm-chart
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Scatter chart of ${shown.length} points, ${label}. Across: comprehensiveness in percent. Up: importance in percent.`}
      className="block h-auto max-w-full rounded border border-line bg-white"
    >
      <defs>
        <marker id="vm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--bar-run)" }} />
        </marker>
      </defs>
      {ticks(xTop).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={H - PAD.bottom} style={{ stroke: "var(--line)" }} />
          <text x={sx(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="12" style={{ fill: "var(--muted)" }}>
            {t}
          </text>
        </g>
      ))}
      {ticks(yTop).map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} style={{ stroke: "var(--line)" }} />
          <text x={PAD.left - 6} y={sy(t) + 4} textAnchor="end" fontSize="12" style={{ fill: "var(--muted)" }}>
            {t}
          </text>
        </g>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 10} textAnchor="middle" fontSize="13" style={{ fill: "var(--foreground)" }}>
        Comprehensiveness (% of the prompt) →
      </text>
      <text transform={`translate(14 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle" fontSize="13" style={{ fill: "var(--foreground)" }}>
        Importance (% of the prompt) →
      </text>
      {shown.map(({ p, v, pv }) =>
        pv && moved(v, pv) ? (
          <line
            key={`m${p.id}`}
            data-vm-arrow={p.num}
            x1={sx(pv.comp)}
            y1={sy(pv.imp)}
            x2={sx(v.comp)}
            y2={sy(v.imp)}
            strokeWidth="1.5"
            markerEnd="url(#vm-arrow)"
            style={{ stroke: "var(--bar-run)" }}
          />
        ) : null,
      )}
      {shown.map(({ p, v, pv }) => {
        const on = p.id === selected;
        const move = pv && moved(v, pv) ? ` Moved from ${prevVersion ?? "the last version"}: comprehensiveness ${oneDecimal(pv.comp)} to ${oneDecimal(v.comp)}, importance ${oneDecimal(pv.imp)} to ${oneDecimal(v.imp)}.` : "";
        const tip = `Point ${p.num}: comprehensiveness ${oneDecimal(v.comp)} %, importance ${oneDecimal(v.imp)} %.${p.added ? " New point (hard add)." : ""}${move} ${p.text.slice(0, 160)}${p.text.length > 160 ? " …" : ""}`;
        return (
          <a key={p.id} href={hrefOf(p.id)} data-vm-dot={p.num} data-vm-added={p.added ? "1" : undefined} aria-label={`Point ${p.num}`}>
            <title>{tip}</title>
            {p.added ? <circle data-vm-ring={p.num} cx={sx(v.comp)} cy={sy(v.imp)} r="9" fill="none" strokeWidth="2.5" style={{ stroke: "var(--bar-ok)" }} /> : null}
            <circle cx={sx(v.comp)} cy={sy(v.imp)} r={on ? 6.5 : 4.5} strokeWidth={on ? 3 : 0} style={{ fill: on ? "var(--title)" : "var(--muted)", stroke: "var(--foreground)", fillOpacity: on ? 1 : 0.75 }} />
            {on || p.added ? (
              <text x={sx(v.comp) + 11} y={sy(v.imp) - 8} fontSize="12" fontWeight={on ? 700 : 400} style={{ fill: "var(--foreground)" }}>
                {p.num}
              </text>
            ) : null}
          </a>
        );
      })}
    </svg>
  );
}
