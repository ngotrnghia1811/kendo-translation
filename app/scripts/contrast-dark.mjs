// Contrast test of the themes (unit UXC step C, round 59. Unit RC1, round 63: all five themes).
// Usage: node scripts/contrast-dark.mjs
// 1. It reads the block [data-theme="..."] of app/globals.css for the themes dark, sepia, solarized-light, and solarized-dark.
//    The theme light has no block. It uses :root of globals.css and the Tailwind default palette (hex values of the Tailwind 3 palette, which Tailwind 4 matches to the eye).
// 2. It tests every text and background pair of the app.
//      dark:                                    every pair must reach 7 to 1 (WCAG AAA), as before.
//      sepia, solarized-light, solarized-dark:  the body text pairs must reach 7 to 1, every other pair 4.5 to 1 (round 63 answer 7).
//      light:                                   every pair must reach 4.5 to 1 (report only: the lowest pair is printed).
// 3. It scans the source files for palette classes (bg-green-100, text-red-700, and so on). A palette color without a value in a theme block is a FAIL,
//    because the class keeps its light color on the dark page. Two colors stay as they are by design: blue-500 and black.
// 4. It prints the lowest pair of each theme.
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const css = await fs.readFile(path.join(root, "app/globals.css"), "utf-8");

// Hex values of the Tailwind default palette for the colors that the app uses (theme light).
const TAILWIND = {
  "color-white": "#ffffff", "color-stone-50": "#fafaf9", "color-stone-100": "#f5f5f4", "color-stone-200": "#e7e5e4", "color-stone-600": "#57534e", "color-stone-700": "#44403c",
  "color-amber-50": "#fffbeb", "color-amber-100": "#fef3c7", "color-amber-200": "#fde68a", "color-amber-300": "#fcd34d", "color-amber-600": "#d97706", "color-amber-700": "#b45309", "color-amber-800": "#92400e", "color-amber-900": "#78350f",
  "color-red-50": "#fef2f2", "color-red-100": "#fee2e2", "color-red-200": "#fecaca", "color-red-700": "#b91c1c", "color-red-800": "#991b1b",
  "color-green-100": "#dcfce7", "color-green-700": "#15803d", "color-green-800": "#166534",
  "color-blue-50": "#eff6ff", "color-blue-100": "#dbeafe", "color-blue-800": "#1e40af", "color-sky-100": "#e0f2fe", "color-sky-800": "#075985", "color-orange-100": "#ffedd5", "color-orange-800": "#9a3412",
};

function readVars(text) {
  const m = new Map();
  for (const v of text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)) m.set(v[1], v[2].toLowerCase());
  return m;
}
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
const themes = new Map();
themes.set("light", new Map([...Object.entries(TAILWIND), ...readVars(rootBlock ? rootBlock[1] : "")]));
for (const name of ["dark", "sepia", "solarized-light", "solarized-dark"]) {
  const block = new RegExp(`\\[data-theme="${name}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (!block) {
    console.log(`FAIL  globals.css has no [data-theme="${name}"] block`);
    process.exit(1);
  }
  themes.set(name, readVars(block[1]));
}

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// Unit VW89 (round 90): the JSON viewer colors are base tokens too (--json-* in :root and in each theme block).
const BASE = ["foreground", "muted", "accent", "background", "line", "json-key", "json-string", "json-number", "json-literal"];
const val = (vars, name) => vars.get(name === "page" ? "background" : name.startsWith("color-") || BASE.includes(name) ? name : "color-" + name);

// [use, text variable, background variable, body text (7 to 1 in every theme except light)]
const PAIRS = [
  ["Run settings: field value and dialog", "foreground", "white", true],
  ["Run settings: field help", "muted", "white"],
  ["Run settings: changed badge", "amber-800", "amber-100"],
  ["Run settings: not-default badge", "stone-600", "stone-100"],
  ["Run settings: custom model warning", "amber-800", "white"],
  ["Run settings: field error", "red-700", "white"],
  ["Run settings: save button", "white", "accent"],
  ["Body text on page", "foreground", "page", true],
  ["Body text on card", "foreground", "white", true],
  ["Muted text on page", "muted", "page"],
  ["Muted text on card", "muted", "white"],
  ["Link on page", "accent", "page"],
  ["Link on card", "accent", "white"],
  ["Save button: text-white on bg-accent", "white", "accent"],
  ["PASS pill", "green-800", "green-100"],
  ["FAIL pill", "red-800", "red-100"],
  ["State running", "blue-800", "blue-100"],
  ["State paused, chip", "amber-800", "amber-100"],
  ["State completed with failures", "orange-800", "orange-100"],
  ["State interrupted, tag agent-written", "stone-700", "stone-200"],
  ["State waiting", "stone-600", "stone-100"],
  ["Marked chip, comments tag, memory pair chip", "sky-800", "sky-100"],
  ["Note box", "blue-800", "blue-50"],
  ["Error text on page", "red-700", "page"],
  ["Error text on card", "red-700", "white"],
  ["Error text in a box", "red-700", "red-50"],
  ["Success text on page", "green-800", "page"],
  ["Mark note on page", "amber-800", "page"],
  ["Warn text on page", "amber-700", "page"],
  ["Run notice and row notice", "amber-900", "amber-50"],
  ["Term highlight", "foreground", "amber-100", true],
  ["Term highlight, hover", "foreground", "amber-200", true],
  ["Resume button", "white", "green-700"],
  ["Resume button, hover", "white", "green-800"],
  ["Pause button", "amber-800", "white"],
  ["Text on stone-50 fill", "foreground", "stone-50"],
  ["Muted text on stone-50 fill", "muted", "stone-50"],
  ["Text on stone-100 fill", "foreground", "stone-100"],
  // Unit VW89 (round 90, Q-A 3:1.8 item 1): the JSON viewer tree sits on the card (white). A hover shows the stone-50 fill. Body text: 7 to 1.
  ["JSON viewer: key on card", "json-key", "white", true],
  ["JSON viewer: text on card", "json-string", "white", true],
  ["JSON viewer: number on card", "json-number", "white", true],
  ["JSON viewer: true, false, null on card", "json-literal", "white", true],
  ["JSON viewer: key on stone-50 fill", "json-key", "stone-50", true],
  ["JSON viewer: text on stone-50 fill", "json-string", "stone-50", true],
  ["JSON viewer: number on stone-50 fill", "json-number", "stone-50", true],
  ["JSON viewer: true, false, null on stone-50 fill", "json-literal", "stone-50", true],
];

let fails = 0;
const lowest = [];
for (const [name, vars] of themes) {
  const limitOf = (body) => (name === "dark" ? 7 : name === "light" ? 4.5 : body ? 7 : 4.5);
  console.log(`\nTheme ${name} (limits: body text ${name === "light" ? 4.5 : 7} to 1, other pairs ${name === "dark" ? 7 : 4.5} to 1):`);
  let low = { r: Infinity, use: "" };
  for (const [use, fg, bg, body] of PAIRS) {
    const a = val(vars, fg);
    const b = val(vars, bg);
    if (!a || !b) {
      fails++;
      console.log(`FAIL  ${use}: no value for ${!a ? fg : bg}`);
      continue;
    }
    const r = ratio(a, b);
    const limit = limitOf(body);
    const ok = r >= limit;
    if (!ok) fails++;
    if (r < low.r) low = { r, use };
    console.log(`${ok ? "PASS" : "FAIL"}  ${use}: ${a} on ${b} = ${r.toFixed(2)} to 1 (limit ${limit})`);
  }
  lowest.push(`${name}: ${low.r.toFixed(2)} to 1 (${low.use})`);
}

// Scan the source for palette classes.
const COLOR = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const re = new RegExp(`(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|from|to|via)-(${COLOR})-([0-9]{2,3})(?:/[0-9]+)?`, "g");
const used = new Map();
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const t = await fs.readFile(p, "utf-8");
      for (const m of t.matchAll(re)) used.set(`${m[1]}-${m[2]}`, (used.get(`${m[1]}-${m[2]}`) ?? 0) + 1);
    }
  }
}
for (const d of ["app", "components", "lib"]) await walk(path.join(root, d));
const KEEP = new Set(["blue-500"]);
for (const name of ["dark", "sepia", "solarized-light", "solarized-dark"]) {
  const vars = themes.get(name);
  const missing = [...used.keys()].filter((k) => !vars.has("color-" + k) && !KEEP.has(k)).sort();
  console.log(`\nPalette colors used in the source: ${used.size}. Without a value in the theme ${name}: ${missing.length}${missing.length ? " (" + missing.join(", ") + ")" : ""}`);
  if (missing.length) fails++;
}
console.log("\nLowest pair of each theme:");
for (const l of lowest) console.log("  " + l);
console.log(`\nFailures: ${fails}`);
process.exit(fails ? 1 : 0);
