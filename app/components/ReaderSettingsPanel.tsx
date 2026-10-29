"use client";
import { LINE_LIMITS, READER_DEFAULTS, SIZE_LIMITS, THEME_LABELS, THEME_NAMES, type ReaderSettings, type ThemeName } from "@/lib/htv-settings";
import type { EffectiveSettings } from "./ReaderPageView";

/*
 * Settings panel of the reader pages (unit RC1, round 63). One cog in the reader bar opens it (VISION-viewer 15.19.6).
 * Round 62 answer 8 (Q-A 2026-10-28 l290): "Themes, fonts, size", "Page and Scroll switch", "Focus mode". The settings stay in the account.
 * On a wide screen the panel sits at the right edge. On a phone it is a sheet over the text. The button Close closes it.
 */

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
  hasHuman,
  onChange,
  onTheme,
  onClose,
}: {
  s: EffectiveSettings;
  theme: ThemeName;
  hasHuman: boolean;
  onChange: (patch: ReaderSettings) => void;
  onTheme: (t: ThemeName) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Reading settings"
      data-reader-settings
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t border border-line bg-white p-4 shadow-lg md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:w-80 md:rounded"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Reading settings</h2>
        <button type="button" onClick={onClose} data-settings-close className="min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2">
          Close
        </button>
      </div>
      <Seg label="Text" value={s.text} options={[{ value: "en", label: "English" }, { value: "ja", label: "Japanese" }, { value: "pair", label: "Pairing" }]} onPick={(v) => onChange({ text: v })} />
      <Seg
        label="English text"
        value={s.en}
        disabled={!hasHuman}
        options={[{ value: "agent", label: "Agent" }, { value: "human", label: "Human" }]}
        onPick={(v) => onChange({ en: v })}
      />
      {!hasHuman ? <p className="-mt-2 mb-3 text-xs text-muted">No human version for this page.</p> : null}
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
    </div>
  );
}
