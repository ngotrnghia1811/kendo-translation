// Pane settings and theme names of the human-translation-view (unit UXC, round 59).
// Round 58 answer 5 (Q-A 2026-10-28 l203): "Every pane should have a setting cog button for customization".
// Round 59 answer 6 (l224): the settings are fonts, sizes, colors, width, and Reset. They stay in the account (collection user_settings).
// The file has no import and no server-only marker, so that server code, client code, and a test script can load it.
// Unit UXC2 (round 61): the same JSON also keeps the view choice (scroll or page) and the state of the two side panels (key ui).

/**
 * Themes of the whole app. Round 63 answer 7 (Q-A 2026-10-28 l311) adds Sepia and two Solarized themes (high contrast) to Light and High-contrast dark.
 * The stored names are the select values of user_settings.theme (migration 1793300009).
 */
export const THEME_NAMES = ["light", "dark", "sepia", "solarized-light", "solarized-dark"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "High-contrast dark",
  sepia: "Sepia",
  "solarized-light": "Solarized light",
  "solarized-dark": "Solarized dark",
};

/** Themes whose page is dark. The browser uses it for the color scheme of controls. */
export const DARK_THEMES: ThemeName[] = ["dark", "solarized-dark"];

/**
 * Default theme of each page group, one constant for each (unit RC1, round 63 answer 7).
 * Round 60 answer 4 (Q-A 2026-10-29 l241): "Light (Recommended)" for the human-translation-view and the monitor.
 * Round 63 answer 7 (l311): "Solarized light will be default." The aki-main reading is that this is the default of the reader pages only.
 * That reading is pending the owner check. To change one group, change one constant.
 */
export const DEFAULT_THEME_HTV: ThemeName = "light";
export const DEFAULT_THEME_READER: ThemeName = "solarized-light";
/** Kept for older callers: the default of the human-translation-view and the monitor. */
export const DEFAULT_THEME: ThemeName = DEFAULT_THEME_HTV;

export function isTheme(v: unknown): v is ThemeName {
  return typeof v === "string" && (THEME_NAMES as readonly string[]).includes(v);
}

/** The 7 panes of the human-translation-view (VISION-viewer 15.16.4). The monitor panes get no cog. */
export const PANE_IDS = ["list", "ja", "agent", "own", "tl3", "comments", "versions"] as const;
export type PaneId = (typeof PANE_IDS)[number];

// Round 61 answer 5 (Q-A l265): one cog for each column header. The labels follow the header row of the book screen.
export const PANE_LABELS: Record<PaneId, string> = {
  list: "Book list and book index",
  ja: "Japanese",
  agent: "Agent translation",
  own: "Your translation",
  tl3: "TL_3 information panel",
  comments: "Comments",
  versions: "Version history",
};

export type FontName = "sans" | "serif" | "mono" | "mincho" | "gothic";

/** System fonts only. The app loads no font from the network. */
export const FONT_STACKS: Record<FontName, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  mincho: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  gothic: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif',
};

export const FONT_LABELS: Record<FontName, string> = { sans: "Sans-serif", serif: "Serif", mono: "Monospace", mincho: "Mincho", gothic: "Gothic" };

/** Fonts that a pane offers: English panes take sans, serif, and mono. Japanese panes take mincho and gothic. */
export const PANE_FONTS: Record<PaneId, FontName[]> = {
  list: ["sans", "serif", "mono"],
  ja: ["mincho", "gothic"],
  agent: ["serif", "sans", "mono"],
  own: ["serif", "sans", "mono"],
  tl3: ["sans", "serif", "mono"],
  comments: ["sans", "serif", "mono"],
  versions: ["sans", "serif", "mono"],
};

/** What a pane looks like without a setting. The size 16.8 px is 1.05 rem, the size of the rows today. */
export const PANE_DEFAULTS: Record<PaneId, { font: FontName; size: number; line: number }> = {
  list: { font: "sans", size: 14, line: 1.5 },
  ja: { font: "mincho", size: 16.8, line: 1.625 },
  agent: { font: "serif", size: 16.8, line: 1.625 },
  own: { font: "serif", size: 16.8, line: 1.625 },
  tl3: { font: "sans", size: 15, line: 1.5 },
  comments: { font: "sans", size: 14, line: 1.5 },
  versions: { font: "sans", size: 14, line: 1.5 },
};

export const SIZE_LIMITS = { min: 12, max: 28 };
export const LINE_LIMITS = { min: 1.2, max: 2.2 };
/** Width of the TL_3 information panel in px. The default stays 416 px (14 rem at 26 rem is 416 px). */
export const TL3_WIDTH = { min: 280, max: 720, default: 416 };
/** Share of the row for the Japanese text, in percent. */
export const SHARE_LIMITS = { min: 30, max: 70, default: 50 };

export interface ThemeColors {
  light?: string | null;
  dark?: string | null;
}

export interface PaneSetting {
  font?: FontName;
  size?: number;
  line?: number;
  /** tl3: width in px. ja: share of the row in percent. agent: share of the row in percent. */
  width?: number;
  color?: ThemeColors;
  bg?: ThemeColors;
}

/** The view of the book screen. Round 61 answer 3 (Q-A l263): a switch "Scroll view" / "Page view", kept in the account. */
export type ViewName = "scroll" | "page";
export const DEFAULT_VIEW: ViewName = "scroll";

export function isView(v: unknown): v is ViewName {
  return v === "scroll" || v === "page";
}

/** Width of the book index in px (round 61 answer 4, Q-A l264: the width of each panel is kept in the account). */
export const INDEX_WIDTH = { min: 160, max: 400, default: 192 };

/**
 * Screen state in the account (unit UXC2, round 61). The width of the TL_3 information panel stays in panes.tl3.width, where older records keep it.
 *   view         scroll or page
 *   index.open   false when the book index is collapsed to a bar
 *   index.width  width of the book index in px
 *   tl3.open     false when the TL_3 information panel is collapsed to a bar
 */
export interface UiSettings {
  view?: ViewName;
  index?: { open?: boolean; width?: number };
  tl3?: { open?: boolean };
}

export interface PaneSettings {
  v: 1;
  panes: Partial<Record<PaneId, PaneSetting>>;
  /** Missing in records that older code wrote. */
  ui?: UiSettings;
  /** Settings of the reader pages (unit RC1, round 63). Missing for an account that never opened them. */
  reader?: ReaderSettings;
}

// ---------------------------------------------------------------- reader pages (unit RC1, round 63)

/**
 * Settings of the reader pages, kept per account (owner 2026-10-07 l67 "Per account, all devices"; VISION-viewer 15.19.6).
 *   text    en = single language English, ja = single language Japanese, pair = bilingual pairing
 *   en      agent = the agent translation (default), human = the human version that an admin chose for the page
 *   view    page = one page at a time (default, round 63 answer 7), scroll = all pages in one scroll
 *   fontEn  serif or sans. fontJa  mincho or gothic. size in px. line = line height. width  narrow (about 72 characters) or wide.
 *   focus   true = focus mode (text only)
 *   index   false = the book index is closed
 */
export type ReaderText = "en" | "ja" | "pair";
export type ReaderEn = "agent" | "human";
export type ReaderWidth = "narrow" | "wide";
export interface ReaderSettings {
  text?: ReaderText;
  en?: ReaderEn;
  view?: ViewName;
  fontEn?: "serif" | "sans";
  fontJa?: "mincho" | "gothic";
  size?: number;
  line?: number;
  width?: ReaderWidth;
  focus?: boolean;
  index?: boolean;
}

export const READER_DEFAULTS: Required<ReaderSettings> = {
  text: "en",
  en: "agent",
  view: "page",
  fontEn: "serif",
  fontJa: "mincho",
  size: 18,
  line: 1.7,
  width: "narrow",
  focus: false,
  index: true,
};

export function sanitizeReader(v: unknown): ReaderSettings | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  const out: ReaderSettings = {};
  if (r.text === "en" || r.text === "ja" || r.text === "pair") out.text = r.text;
  if (r.en === "agent" || r.en === "human") out.en = r.en;
  if (isView(r.view)) out.view = r.view;
  if (r.fontEn === "serif" || r.fontEn === "sans") out.fontEn = r.fontEn;
  if (r.fontJa === "mincho" || r.fontJa === "gothic") out.fontJa = r.fontJa;
  const size = num(r.size, SIZE_LIMITS.min, SIZE_LIMITS.max, 1);
  if (size !== undefined) out.size = size;
  const line = num(r.line, LINE_LIMITS.min, LINE_LIMITS.max, 1);
  if (line !== undefined) out.line = line;
  if (r.width === "narrow" || r.width === "wide") out.width = r.width;
  if (typeof r.focus === "boolean") out.focus = r.focus;
  if (typeof r.index === "boolean") out.index = r.index;
  return Object.keys(out).length ? out : undefined;
}

export const EMPTY_SETTINGS: PaneSettings = { v: 1, panes: {} };

/** The column "panes" of user_settings holds at most this many bytes (migration 1793300005). */
export const PANES_MAX_BYTES = 20000;

const HEX = /^#[0-9a-fA-F]{6}$/;

function num(v: unknown, min: number, max: number, digits: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const c = Math.min(max, Math.max(min, v));
  const f = Math.pow(10, digits);
  return Math.round(c * f) / f;
}

function colors(v: unknown): ThemeColors | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const out: ThemeColors = {};
  for (const t of ["light", "dark"] as const) {
    const c = o[t];
    if (typeof c === "string" && HEX.test(c)) out[t] = c.toLowerCase();
  }
  return out.light || out.dark ? out : undefined;
}

function sanitizeUi(v: unknown): UiSettings | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  const out: UiSettings = {};
  if (isView(r.view)) out.view = r.view;
  const idx = r.index && typeof r.index === "object" ? (r.index as Record<string, unknown>) : null;
  if (idx) {
    const i: NonNullable<UiSettings["index"]> = {};
    if (typeof idx.open === "boolean") i.open = idx.open;
    const w = num(idx.width, INDEX_WIDTH.min, INDEX_WIDTH.max, 0);
    if (w !== undefined) i.width = w;
    if (Object.keys(i).length) out.index = i;
  }
  const t = r.tl3 && typeof r.tl3 === "object" ? (r.tl3 as Record<string, unknown>) : null;
  if (t && typeof t.open === "boolean") out.tl3 = { open: t.open };
  return Object.keys(out).length ? out : undefined;
}

/**
 * Clean any value into valid pane settings. Unknown panes, unknown fonts, and bad numbers drop out. Numbers are clamped to the limits.
 * The key ui is optional. An older record without it stays readable.
 */
export function sanitizeSettings(x: unknown): PaneSettings {
  const out: PaneSettings = { v: 1, panes: {} };
  const ui = sanitizeUi(x && typeof x === "object" ? (x as { ui?: unknown }).ui : null);
  if (ui) out.ui = ui;
  const reader = sanitizeReader(x && typeof x === "object" ? (x as { reader?: unknown }).reader : null);
  if (reader) out.reader = reader;
  const panes = x && typeof x === "object" ? (x as { panes?: unknown }).panes : null;
  if (!panes || typeof panes !== "object") return out;
  for (const id of PANE_IDS) {
    const raw = (panes as Record<string, unknown>)[id];
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const s: PaneSetting = {};
    if (typeof r.font === "string" && (PANE_FONTS[id] as string[]).includes(r.font)) s.font = r.font as FontName;
    const size = num(r.size, SIZE_LIMITS.min, SIZE_LIMITS.max, 1);
    if (size !== undefined) s.size = size;
    const line = num(r.line, LINE_LIMITS.min, LINE_LIMITS.max, 1);
    if (line !== undefined) s.line = line;
    if (id === "tl3") {
      const w = num(r.width, TL3_WIDTH.min, TL3_WIDTH.max, 0);
      if (w !== undefined) s.width = w;
    } else if (id === "ja" || id === "agent") {
      const w = num(r.width, SHARE_LIMITS.min, SHARE_LIMITS.max, 0);
      if (w !== undefined) s.width = w;
    }
    const c = colors(r.color);
    if (c) s.color = c;
    const b = colors(r.bg);
    if (b) s.bg = b;
    if (Object.keys(s).length) out.panes[id] = s;
  }
  return out;
}

// ---------------------------------------------------------------- colors and contrast

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio of two colors in the form #rrggbb. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The pane colors of an account have two slots, light and dark. Sepia and Solarized light use the light slot. Solarized dark uses the dark slot. */
export function colorKey(theme: ThemeName): "light" | "dark" {
  return DARK_THEMES.includes(theme) ? "dark" : "light";
}

/** The colors that a pane has without a setting, for the contrast warning. */
export const THEME_DEFAULT_COLORS: Record<ThemeName, { text: string; bg: string }> = {
  light: { text: "#1f1d1a", bg: "#ffffff" },
  dark: { text: "#ffffff", bg: "#1a1a1a" },
  sepia: { text: "#2b2118", bg: "#f4ecd8" },
  "solarized-light": { text: "#073642", bg: "#fdf6e3" },
  "solarized-dark": { text: "#eee8d5", bg: "#002b36" },
};

/** Lower limit of the contrast ratio. The cog shows a warning below it (round 59 answer 6). */
export const CONTRAST_WARN = 4.5;

/** Contrast ratio of the text color and the background color of a pane in a theme. A color without a setting takes the theme color. */
export function paneContrast(s: PaneSetting | undefined, theme: ThemeName): number {
  const d = THEME_DEFAULT_COLORS[theme];
  const k = colorKey(theme);
  return contrastRatio(s?.color?.[k] || d.text, s?.bg?.[k] || d.bg);
}

// ---------------------------------------------------------------- style of a pane

/** Inline style of a pane for the theme. A value without a setting stays out, so the class of the pane applies. */
export function paneStyle(id: PaneId, s: PaneSetting | undefined, theme: ThemeName): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!s) return out;
  if (s.font && s.font !== PANE_DEFAULTS[id].font) out.fontFamily = FONT_STACKS[s.font];
  if (s.size !== undefined) out.fontSize = `${s.size}px`;
  if (s.line !== undefined) out.lineHeight = s.line;
  const k = colorKey(theme);
  const c = s.color?.[k];
  if (c) out.color = c;
  const b = s.bg?.[k];
  if (b) out.backgroundColor = b;
  return out;
}
