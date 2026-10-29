// Contrast test of the high-contrast dark theme (unit UXC step C, round 59).
// Usage: node scripts/contrast-dark.mjs
// 1. It reads the block [data-theme="dark"] of app/globals.css.
// 2. It tests every text and background pair of the app. Each pair must reach 7 to 1 (WCAG AAA). A lower ratio is a FAIL.
// 3. It scans the source files for palette classes (bg-green-100, text-red-700, and so on). A palette color without a dark value is a FAIL,
//    because the class keeps its light color on the black page. Two colors stay as they are by design: blue-500 and black.
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const css = await fs.readFile(path.join(root, "app/globals.css"), "utf-8");
const block = /\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/.exec(css);
if (!block) {
  console.log("FAIL  globals.css has no [data-theme=\"dark\"] block");
  process.exit(1);
}
const dark = new Map();
for (const m of block[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)) dark.set(m[1], m[2].toLowerCase());

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const val = (name) => dark.get(name === "page" ? "background" : name.startsWith("color-") || ["foreground", "muted", "accent", "background", "line"].includes(name) ? name : "color-" + name);

// [use, text variable, background variable]
const PAIRS = [
  ["Body text on page", "foreground", "page"],
  ["Muted text on page", "muted", "page"],
  ["Muted text on card", "muted", "white"],
  ["Body text on card", "foreground", "white"],
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
  ["Term highlight", "foreground", "amber-100"],
  ["Term highlight, hover", "foreground", "amber-200"],
  ["Resume button", "white", "green-700"],
  ["Resume button, hover", "white", "green-800"],
  ["Pause button", "amber-800", "white"],
  ["Text on stone-50 fill", "foreground", "stone-50"],
  ["Muted text on stone-50 fill", "muted", "stone-50"],
  ["Text on stone-100 fill", "foreground", "stone-100"],
];

let fails = 0;
console.log("Dark theme pairs (limit 7 to 1):");
for (const [use, fg, bg] of PAIRS) {
  const a = val(fg);
  const b = val(bg);
  if (!a || !b) {
    fails++;
    console.log(`FAIL  ${use}: no dark value for ${!a ? fg : bg}`);
    continue;
  }
  const r = ratio(a, b);
  const ok = r >= 7;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${use}: ${a} on ${b} = ${r.toFixed(2)} to 1`);
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
const missing = [...used.keys()].filter((k) => !dark.has("color-" + k) && !KEEP.has(k)).sort();
console.log(`\nPalette colors used in the source: ${used.size}. Without a dark value: ${missing.length}${missing.length ? " (" + missing.join(", ") + ")" : ""}`);
if (missing.length) fails++;
console.log(`\nFailures: ${fails}`);
process.exit(fails ? 1 : 0);
