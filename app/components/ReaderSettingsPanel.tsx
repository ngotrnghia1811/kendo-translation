"use client";
import { LINE_LIMITS, READER_DEFAULTS, SIZE_LIMITS, THEME_LABELS, THEME_NAMES, type ReaderSettings, type ThemeName } from "@/lib/htv-settings";
import type { EffectiveSettings } from "@/lib/reader-layout";

/*
 * Settings panel of the reader pages (unit RC1, round 63). One cog in the reader bar opens it (VISION-viewer 15.19.6).
 * Round 62 answer 8 (Q-A 2026-10-28 l290): "Themes, fonts, size", "Page and Scroll switch", "Focus mode". The settings stay in the account.
 * On a wide screen the panel sits at the right edge (in the first-visit mode at the left edge, unit VW116). On a phone it is a sheet over the text. The button Close closes it.
 * Unit RC3 (round 66 answer 1 and 5): the page image switch moved to the reader bar (button Image in ReaderBook).
 * Unit RC4 (round 68 answer 5: "Close only at Start reading", round 69 answer 13: "Every account sees it once"): in the first-visit mode the button "Start reading" replaces
 * "Close". Only that button or the Esc key closes the panel (ReaderBook). A change of a setting does not close it. VISION-viewer 15.23.6.
 * On a phone the first-visit sheet is up to 50 percent of the screen high (else 85 percent), so that a part of the text shows above it. The button sits at the bottom of the sheet.
 * Unit RT73b (round 73c answer 4): the rows Text and English text are gone. The component list replaces them (button Components in the reader bar). The first-visit
 * panel holds the same list as its first group (`componentList`, unit default D5). "Reset text settings" leaves the layout alone.
 */

// Unit VW116 (Q-A 3:95.4 row c, finding 2 of VW115): on a wide screen (md, 768 px and up) the box used to sit at the right edge in both modes. In the first-visit mode it
// covered the corner handle of the last panel of /read/<book> (the corner sits at the right edge of the panel row) until the reader pressed "Start reading".
// [unit default VW116] In the first-visit mode the box now sits at the LEFT edge, over the page index and the left end of the first panel. No panel corner
// handle is there: the corners of the panels stand at the right end of each panel, and the last one at the right end of the row. The box from the cog
// (not the first-visit mode) keeps the right edge. Owner rules stay: "Close only at Start reading" (round 68 answer 5) and "Every account sees it once"
// (round 69 answer 13). The code that shows and closes the box (ReaderBook.tsx) is not changed. On a phone (below 768 px) the box is a sheet at the bottom
// and the panels stand one under the other with no handles, so nothing changes there.
export const SETTINGS_SIDE = "md:right-4";
export const FIRST_VISIT_SIDE = "md:left-4";

function Seg<T extends string>({ label, value, options, onPick, disabled }: { label: string; value: T; options: { value: T; label: string }[]; onPick: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div role="group" aria-label={label} className="flex flex-wrap overflow-hidden rounded border border-line text-sm">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={value === o.value}
            data-setting={`${label}:${o.value}`}
            onClick={() => onPick(o.value)}
            className={"min-h-[44px] px-3 py-1 disabled:opacity-50 md:min-h-0 " + (value === o.value ? "bg-accent font-semibold text-white" : "text-foreground")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReaderSettingsPanel({
  s,
  theme,
  onChange,
  onTheme,
  onClose,
  firstVisit = false,
  images,
  componentList,
}: {
  s: EffectiveSettings;
  theme: ThemeName;
  onChange: (patch: ReaderSettings) => void;
  onTheme: (t: ThemeName) => void;
  /** The button "Close", or in the first-visit mode the button "Start reading". */
  onClose: () => void;
  firstVisit?: boolean;
  /** True for a work with page images: the first-visit panel then names the Image button. Else it names the Original text button. */
  images: boolean;
  /** The component list for the first group of the first-visit panel. */
  componentList?: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label="Reading settings"
      data-reader-settings
      {...(firstVisit ? { "data-first-visit": "" } : {})}
      className={"fixed inset-x-0 bottom-0 z-50 overflow-auto rounded-t border border-line bg-white p-4 shadow-lg md:inset-x-auto md:bottom-auto md:top-20 md:max-h-[85vh] md:w-80 md:rounded " + (firstVisit ? "max-h-[50vh] " + FIRST_VISIT_SIDE : "max-h-[85vh] " + SETTINGS_SIDE)}
    >
      {firstVisit ? componentList : null}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Reading settings</h2>
        {firstVisit ? null : (
          <button type="button" onClick={onClose} data-settings-close className="min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2">
            Close
          </button>
        )}
      </div>
      <Seg label="View" value={s.view} options={[{ value: "page", label: "Page view" }, { value: "scroll", label: "Scroll view" }]} onPick={(v) => onChange({ view: v })} />
      <Seg label="Theme" value={theme} options={THEME_NAMES.map((t) => ({ value: t, label: THEME_LABELS[t] }))} onPick={onTheme} />
      <Seg label="English font" value={s.fontEn} options={[{ value: "serif", label: "Serif" }, { value: "sans", label: "Sans-serif" }]} onPick={(v) => onChange({ fontEn: v })} />
      <Seg label="Japanese font" value={s.fontJa} options={[{ value: "mincho", label: "Mincho" }, { value: "gothic", label: "Gothic" }]} onPick={(v) => onChange({ fontJa: v })} />
      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Size: {s.size} px</span>
        <input type="range" min={SIZE_LIMITS.min} max={SIZE_LIMITS.max} step={0.5} value={s.size} data-setting-size onChange={(e) => onChange({ size: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Line height: {s.line}</span>
        <input type="range" min={LINE_LIMITS.min} max={LINE_LIMITS.max} step={0.1} value={s.line} data-setting-line onChange={(e) => onChange({ line: Number(e.target.value) })} className="w-full" />
      </label>
      <Seg label="Width" value={s.width} options={[{ value: "narrow", label: "Narrow" }, { value: "wide", label: "Wide" }]} onPick={(v) => onChange({ width: v })} />
      <Seg label="Focus mode" value={s.focus ? "on" : "off"} options={[{ value: "off", label: "Off" }, { value: "on", label: "On" }]} onPick={(v) => onChange({ focus: v === "on" })} />
      <button
        type="button"
        data-settings-reset
        onClick={() => {
          onChange({ ...READER_DEFAULTS, view: s.view, index: s.index });
        }}
        className="min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2"
      >
        Reset text settings
      </button>
      {firstVisit ? (
        <div className="sticky -bottom-4 -mx-4 -mb-4 mt-3 border-t border-line bg-white px-4 pb-4 pt-3" data-first-visit-footer>
          <p className="mb-2 text-sm" data-image-note>
            {images ? "Use the Image button in the bar above the text to show or hide the page image." : "Use the Original text button in the bar above the text to show or hide the Japanese text."}
          </p>
          <button type="button" onClick={onClose} data-start-reading className="min-h-[44px] w-full rounded bg-accent px-3 py-2 font-semibold text-white">
            Start reading
          </button>
        </div>
      ) : null}
    </div>
  );
}
