"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CONTRAST_WARN,
  EMPTY_SETTINGS,
  FONT_LABELS,
  LINE_LIMITS,
  PANE_DEFAULTS,
  PANE_FONTS,
  PANE_LABELS,
  SHARE_LIMITS,
  SIZE_LIMITS,
  THEME_DEFAULT_COLORS,
  TL3_WIDTH,
  paneContrast,
  paneStyle,
  type FontName,
  type PaneId,
  type PaneSetting,
  type PaneSettings,
  type ThemeName,
} from "@/lib/htv-settings";
import { THEME_EVENT } from "./ThemeSwitch";

// Settings cog of the panes (unit UXC step E, round 59). Round 58 answer 5 (Q-A 2026-10-28 l203): "Every pane should have a setting cog button for customization".
// Round 59 answer 6 (l224): the 7 panes of the human-translation-view, with font, size, line height, text color, background color, width, and Reset.
// The settings stay in the account (collection user_settings, route /api/htv/settings). A change applies at once and saves 800 ms after the last change.
// A custom color belongs to one theme (light or dark). The cog shows a warning when the text and background colors have a contrast below 4.5 to 1.

const SAVE_DELAY_MS = 800; // VISION-viewer 15.16.4

interface Ctx {
  settings: PaneSettings;
  theme: ThemeName;
  update: (id: PaneId, patch: (s: PaneSetting) => PaneSetting) => void;
  edit: (fn: (s: PaneSettings) => PaneSettings) => void;
  reset: (id: PaneId) => void;
  resetAll: () => void;
  saveNote: string;
}

const PaneCtx = createContext<Ctx | null>(null);

function usePaneCtx(): Ctx {
  const c = useContext(PaneCtx);
  if (!c) throw new Error("PaneSettingsProvider is missing.");
  return c;
}

export function PaneSettingsProvider({ initial, theme: initialTheme, children }: { initial: PaneSettings; theme: ThemeName; children: React.ReactNode }) {
  const [settings, setSettings] = useState<PaneSettings>(initial ?? EMPTY_SETTINGS);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [saveNote, setSaveNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(settings);

  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ThemeName>).detail;
      if (t === "light" || t === "dark") setTheme(t);
    };
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);

  const schedule = useCallback((next: PaneSettings) => {
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/htv/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ panes: latest.current }) });
        setSaveNote(r.ok ? "" : r.status === 401 ? "Your sign-in ended. The settings stay on this screen only." : "The settings were not saved to your account.");
      } catch {
        setSaveNote("The settings were not saved to your account.");
      }
    }, SAVE_DELAY_MS);
  }, []);

  const apply = useCallback(
    (fn: (s: PaneSettings) => PaneSettings) => {
      setSettings((s) => {
        const next = fn(s);
        schedule(next);
        return next;
      });
    },
    [schedule],
  );

  const update = useCallback(
    (id: PaneId, patch: (s: PaneSetting) => PaneSetting) => {
      apply((s) => {
        const cur = patch({ ...(s.panes[id] ?? {}) });
        const panes = { ...s.panes };
        if (Object.keys(cur).length === 0) delete panes[id];
        else panes[id] = cur;
        return { v: 1, panes };
      });
    },
    [apply],
  );
  const reset = useCallback(
    (id: PaneId) =>
      apply((s) => {
        const panes = { ...s.panes };
        delete panes[id];
        return { v: 1, panes };
      }),
    [apply],
  );
  const resetAll = useCallback(() => apply(() => ({ v: 1, panes: {} })), [apply]);

  const value = useMemo(() => ({ settings, theme, update, edit: apply, reset, resetAll, saveNote }), [settings, theme, update, apply, reset, resetAll, saveNote]);
  return <PaneCtx.Provider value={value}>{children}</PaneCtx.Provider>;
}

/** The style of a pane (font, size, line height, colors) and its width setting. */
export function usePaneSetting(id: PaneId): { style: React.CSSProperties; setting: PaneSetting | undefined } {
  const { settings, theme } = usePaneCtx();
  const setting = settings.panes[id];
  return { style: paneStyle(id, setting, theme) as React.CSSProperties, setting };
}

/** Width of the TL_3 information panel in px, and the function that changes it. */
export function useTl3Width(): [number, (w: number) => void] {
  const { settings, update } = usePaneCtx();
  const w = settings.panes.tl3?.width ?? TL3_WIDTH.default;
  return [w, (n: number) => update("tl3", (s) => ({ ...s, width: n }))];
}

/** Share of the row for the JA column in percent. The agent column takes the rest. */
export function useJaShare(): number {
  const { settings } = usePaneCtx();
  const ja = settings.panes.ja?.width;
  const ag = settings.panes.agent?.width;
  return ja ?? (ag !== undefined ? 100 - ag : SHARE_LIMITS.default);
}

// ---------------------------------------------------------------- the cog

function Row({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="mt-2">
      <label className="block text-xs text-muted" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-0.5 flex items-center gap-2">{children}</div>
    </div>
  );
}

function ColorRow({ id, label, field }: { id: PaneId; label: string; field: "color" | "bg" }) {
  const { settings, theme, update } = usePaneCtx();
  const set = settings.panes[id]?.[field]?.[theme];
  const fallback = field === "color" ? THEME_DEFAULT_COLORS[theme].text : THEME_DEFAULT_COLORS[theme].bg;
  return (
    <Row label={`${label} (${theme === "dark" ? "dark theme" : "light theme"})`} htmlFor={`cog-${id}-${field}`}>
      <input
        id={`cog-${id}-${field}`}
        type="color"
        value={set ?? fallback}
        onChange={(e) => update(id, (s) => ({ ...s, [field]: { ...(s[field] ?? {}), [theme]: e.target.value } }))}
        className="h-7 w-10 cursor-pointer rounded border border-line bg-white p-0"
      />
      <span className="font-mono text-xs">{set ?? "theme color"}</span>
      {set ? (
        <button
          type="button"
          onClick={() =>
            update(id, (s) => {
              const rest = { ...(s[field] ?? {}) };
              delete rest[theme];
              const next = { ...s };
              if (rest.light || rest.dark) next[field] = rest;
              else delete next[field];
              return next;
            })
          }
          className="text-xs text-accent underline"
        >
          Use the theme color
        </button>
      ) : null}
    </Row>
  );
}

export function PaneCog({ id }: { id: PaneId }) {
  const { settings, theme, update, edit, reset, resetAll, saveNote } = usePaneCtx();
  const share = useJaShare();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const s = settings.panes[id];
  const def = PANE_DEFAULTS[id];
  const ratio = paneContrast(s, theme);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const font: FontName = s?.font ?? def.font;
  const size = s?.size ?? def.size;
  const line = s?.line ?? def.line;
  const hasWidth = id === "tl3" || id === "ja" || id === "agent";
  const wLimits = id === "tl3" ? TL3_WIDTH : SHARE_LIMITS;
  const width = id === "tl3" ? (s?.width ?? TL3_WIDTH.default) : id === "ja" ? share : 100 - share;

  return (
    <div ref={box} className="relative inline-block" data-cog-pane={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Settings of the pane: ${PANE_LABELS[id]}`}
        title={`Settings: ${PANE_LABELS[id]}`}
        className={"rounded border border-line bg-white px-1.5 text-sm leading-5 hover:bg-stone-100 " + (s ? "text-accent" : "text-muted")}
        data-cog={id}
      >
        ⚙
      </button>
      {open ? (
        <div role="dialog" aria-label={`Settings of the pane: ${PANE_LABELS[id]}`} className="absolute right-0 top-7 z-30 w-64 rounded border border-line bg-white p-3 text-sm font-sans text-foreground shadow-lg" data-cog-box={id}>
          <div className="font-semibold">{PANE_LABELS[id]}</div>
          <Row label="Font" htmlFor={`cog-${id}-font`}>
            <select
              id={`cog-${id}-font`}
              value={font}
              onChange={(e) => update(id, (x) => ({ ...x, font: e.target.value as FontName }))}
              className="w-full rounded border border-line bg-white px-1.5 py-0.5"
            >
              {PANE_FONTS[id].map((f) => (
                <option key={f} value={f}>
                  {FONT_LABELS[f]}
                </option>
              ))}
            </select>
          </Row>
          <Row label={`Font size: ${size} px`} htmlFor={`cog-${id}-size`}>
            <input
              id={`cog-${id}-size`}
              type="range"
              min={SIZE_LIMITS.min}
              max={SIZE_LIMITS.max}
              step={1}
              value={Math.round(size)}
              onChange={(e) => update(id, (x) => ({ ...x, size: Number(e.target.value) }))}
              className="w-full"
            />
          </Row>
          <Row label={`Line height: ${line}`} htmlFor={`cog-${id}-line`}>
            <input
              id={`cog-${id}-line`}
              type="range"
              min={LINE_LIMITS.min}
              max={LINE_LIMITS.max}
              step={0.1}
              value={line}
              onChange={(e) => update(id, (x) => ({ ...x, line: Math.round(Number(e.target.value) * 10) / 10 }))}
              className="w-full"
            />
          </Row>
          <ColorRow id={id} label="Text color" field="color" />
          <ColorRow id={id} label="Background color" field="bg" />
          {ratio < CONTRAST_WARN ? (
            <p role="alert" className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900" data-contrast-warning>
              Low contrast: {ratio.toFixed(1)} to 1. The text can be hard to read. Use {CONTRAST_WARN} to 1 or more.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted" data-contrast-ok>
              Contrast: {ratio.toFixed(1)} to 1.
            </p>
          )}
          {hasWidth ? (
            <Row label={id === "tl3" ? `Width: ${width} px` : `Share of the row: ${width} percent`} htmlFor={`cog-${id}-width`}>
              <input
                id={`cog-${id}-width`}
                type="range"
                min={wLimits.min}
                max={wLimits.max}
                step={id === "tl3" ? 8 : 1}
                value={width}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (id === "tl3") return update(id, (x) => ({ ...x, width: v }));
                  // The JA column and the agent column share the row. Only one of the two keeps a width.
                  edit((st) => {
                    const panes = { ...st.panes };
                    panes[id] = { ...(panes[id] ?? {}), width: v };
                    const other = id === "ja" ? "agent" : "ja";
                    if (panes[other]) {
                      const o = { ...panes[other] };
                      delete o.width;
                      if (Object.keys(o).length > 0) panes[other] = o;
                      else delete panes[other];
                    }
                    return { v: 1, panes };
                  });
                }}
                className="w-full"
              />
            </Row>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => reset(id)} className="rounded border border-line px-2 py-0.5" data-cog-reset={id}>
              Reset this pane
            </button>
            <button type="button" onClick={resetAll} className="text-xs text-accent underline" data-cog-reset-all>
              Reset all panes
            </button>
          </div>
          {saveNote ? (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {saveNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** A pane with its settings: the style of the pane and the cog in the top right corner. */
export function Pane({ id, className = "", children, lang, dataAttr }: { id: PaneId; className?: string; children: React.ReactNode; lang?: string; dataAttr?: Record<string, string> }) {
  const { style } = usePaneSetting(id);
  return (
    <div className={`relative ${className}`} style={style} lang={lang} data-pane={id} {...dataAttr}>
      <div className="float-right ml-2 text-[14px] leading-none" style={{ fontFamily: "var(--font-sans)" }}>
        <PaneCog id={id} />
      </div>
      {children}
    </div>
  );
}
