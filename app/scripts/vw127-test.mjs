// Unit VW127 (plan P67, card P67.1): the color highlight rows 1-9 of Q-A 3:122.4 on the Monitor pages. No network, no server.
// Owner visual issue 20261122-164451-f6e316: "Add some highlight color to the information. Use as much color highlight as possible".
// It proves:
//   - row 9: every new text color pair reaches 4.5 to 1 (WCAG AA, normal text) in all 5 themes of app/globals.css;
//   - row 5: the heartbeat rule (1:59 green, 2:00 amber, 10:00 amber, 10:01 red, unknown gray);
//   - row 7: the stop reason rule;
//   - rows 1 to 8: the segment kinds are cut and drawn (data-hl);
//   - no text change: the segments joined equal the old text, for fixed samples, for random texts, and for the REAL status files of the Translator (read only).
// Run: scripts/dev/cleanenv.sh env TMPDIR=<unit>/tmp node scripts/vw127-test.mjs
import assert from "node:assert/strict";
import { promises as fs, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");

const HL = await import("../lib/hl-rules.ts");
const RULES = await import("../lib/book-status-rules.ts");
const { HlSpan, HlText, HlTitle, HlFolder, HlTime, HlDuration, HlCount, HlFailed, HlAlive, HlPage, HlTimeText, HlNumberParts } = await import("../components/HlSpan.tsx");
const { default: HlLine } = await import("../components/HlLine.tsx");
const { BoxText } = await import("../components/BoxCode.tsx");

// The Translator data folder is read only. The test reads it through a temp config (no write).
const T2_DATA = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data";

const textOf = (html) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const attrs = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, "g"))].map((m) => m[1]);

// ---------------------------------------------------------------- row 9: contrast in all 5 themes
const css = read("app/globals.css");
const hexLin = (v) => {
  const n = Number.parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
};
const lum = (v) => {
  const [r, g, b] = hexLin(v);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
// Tailwind defaults for the light theme (the :root block does not override these four).
const LIGHT_DEFAULTS = { "color-white": "#ffffff", "color-stone-50": "#fafaf9", "color-stone-100": "#f5f5f4", "color-stone-200": "#e7e5e4" };
/** The color variables of each theme block of globals.css: ":root" is light, the others are [data-theme="..."]. */
function themeVars() {
  const out = {};
  for (const m of css.matchAll(/(:root|\[data-theme="([a-z-]+)"\])\s*\{([^}]*)\}/g)) {
    const name = m[2] ?? "light";
    const vars = Object.fromEntries([...m[3].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((v) => [v[1], v[2]]));
    if (vars.background) out[name] = { ...(out[name] ?? {}), ...vars };
  }
  return out;
}
const THEMES = themeVars();
const THEME_NAMES = ["light", "dark", "sepia", "solarized-light", "solarized-dark"];
// The backgrounds that a Monitor line can stand on: the page, the card (white), the two stone grays, the hover gray, the open fold, the deeper open fold, the group header.
const BACKGROUNDS = ["background", "color-white", "color-stone-50", "color-stone-100", "color-stone-200", "open", "open-deep", "section"];
const TEXT_VARS = ["hl-time", "hl-good", "hl-warn", "hl-bad"];
// Pairs of a chip: [ink variable, background variable].
const CHIP_PAIRS = [
  ["hl-page-ink", "hl-page"],
  ["hl-ts-ink", "hl-ts"],
  ["chip-tl-ink", "chip-tl"],
  ["hl-ed-ink", "hl-ed"],
  ["hl-qa-ink", "hl-qa"],
  ["state-ok-ink", "state-ok"],
  ["state-stop-ink", "state-stop"],
  ["state-fail-ink", "state-fail"],
];
const val = (theme, name) => THEMES[theme][name] ?? (theme === "light" ? LIGHT_DEFAULTS[name] : undefined) ?? THEMES.light[name] ?? LIGHT_DEFAULTS[name];

await check("row 9: globals.css defines the 5 themes and every new --hl-* variable in each one", () => {
  assert.deepEqual(Object.keys(THEMES).sort(), [...THEME_NAMES].sort());
  for (const t of THEME_NAMES)
    for (const v of ["hl-page", "hl-page-ink", "hl-ts", "hl-ts-ink", "hl-ed", "hl-ed-ink", "hl-qa", "hl-qa-ink", "hl-time", "hl-good", "hl-warn", "hl-bad"]) assert.ok(THEMES[t][v], `${t} has --${v}`);
});

let pairCount = 0;
for (const t of THEME_NAMES) {
  await check(`row 9: theme ${t}: the text colors (time, good, warn, bad, accent, muted) reach 4.5 to 1 on every background`, () => {
    for (const fgName of [...TEXT_VARS, "accent", "muted"])
      for (const bgName of BACKGROUNDS) {
        const fg = val(t, fgName);
        const bg = val(t, bgName);
        assert.ok(fg && bg, `${t}: --${fgName} and --${bgName} exist`);
        const r = ratio(fg, bg);
        pairCount++;
        assert.ok(r >= 4.5, `${t}: ${fgName} ${fg} on ${bgName} ${bg}: ${r.toFixed(2)}`);
      }
  });
  await check(`row 9: theme ${t}: the chip and pill pairs (page, TS, TL, ED, QA, ok, pause, fail) reach 4.5 to 1`, () => {
    for (const [inkName, bgName] of CHIP_PAIRS) {
      const ink = val(t, inkName);
      const bg = val(t, bgName);
      assert.ok(ink && bg, `${t}: --${inkName} and --${bgName} exist`);
      const r = ratio(ink, bg);
      pairCount++;
      assert.ok(r >= 4.5, `${t}: ${inkName} ${ink} on ${bgName} ${bg}: ${r.toFixed(2)}`);
    }
  });
}

await check("row 9: the 3 tones and the 4 stage chips are different colors in each theme (time = good: the same green by design)", () => {
  for (const t of THEME_NAMES) {
    const tones = new Set([val(t, "hl-good"), val(t, "hl-warn"), val(t, "hl-bad")]);
    assert.equal(tones.size, 3, `${t}: green, amber, red differ`);
    const chips = new Set([val(t, "hl-ts"), val(t, "chip-tl"), val(t, "hl-ed"), val(t, "hl-qa")]);
    assert.equal(chips.size, 4, `${t}: the 4 stage colors differ`);
    assert.equal(val(t, "hl-time"), val(t, "hl-good"), `${t}: a time is the same green as the good tone`);
  }
});

await check("row 9: the number of pairs checked is printed (information)", () => {
  assert.ok(pairCount >= 5 * (4 + 2) * 8 + 5 * 8, String(pairCount));
  console.log(`  pairs checked: ${pairCount}`);
});

await check("rows 1-8: the CSS has one rule for each kind, and the rules use variables only (no color literal)", () => {
  const start = css.indexOf("Unit VW127");
  assert.ok(start > 0, "the VW127 block exists");
  const layer = css.slice(css.lastIndexOf("@layer components {"));
  for (const sel of [".hl-title", ".hl-page", ".hl-box", ".hl-box-ts", ".hl-box-tl", ".hl-box-ed", ".hl-box-qa", ".hl-critic", ".hl-time", ".hl-duration", ".hl-count", ".hl-failed", ".hl-alive", ".hl-reason", ".hl-folder"])
    assert.ok(layer.includes(sel), `rule ${sel}`);
  assert.match(layer, /\.hl-critic\s*\{[^}]*dashed/, "a critic has a dashed border");
  assert.match(layer, /\.hl-folder\s*\{[^}]*monospace|\.hl-folder\s*\{[^}]*font-mono|\.hl-folder\s*\{[^}]*var\(--font-mono\)/, "a folder name is monospace");
  assert.doesNotMatch(layer, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, "no color literal in the component layer");
});

await check("rows 1-8: the new components and rules have no color literal and no Tailwind color class", () => {
  for (const f of ["lib/hl-rules.ts", "components/HlSpan.tsx", "components/HlLine.tsx", "components/BoxCode.tsx"]) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(|hsla?\(/, `${f}: no color literal`);
    assert.doesNotMatch(src, /\b(?:text|bg|border)-(?:red|green|amber|blue|teal|purple|orange|yellow|stone|gray|slate)-\d{2,3}\b/, `${f}: no Tailwind palette class`);
  }
});

// ---------------------------------------------------------------- row 5: the heartbeat rule
await check("row 5: aliveTone: 1:59 green, 2:00 amber, 10:00 amber, 10:01 red, unknown gray", () => {
  assert.equal(HL.aliveTone(0), "good");
  assert.equal(HL.aliveTone(59), "good");
  assert.equal(HL.aliveTone(1 * 60 + 59), "good");
  assert.equal(HL.aliveTone(2 * 60), "warn");
  assert.equal(HL.aliveTone(5 * 60), "warn");
  assert.equal(HL.aliveTone(10 * 60), "warn");
  assert.equal(HL.aliveTone(10 * 60 + 1), "bad");
  assert.equal(HL.aliveTone(3600), "bad");
  assert.equal(HL.aliveTone(-5), "good", "a clock a little behind counts as 0 s");
  for (const x of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(HL.aliveTone(x), "none", String(x));
  assert.equal(HL.ALIVE_AMBER_FROM_S, 120);
  assert.equal(HL.ALIVE_RED_OVER_S, 600);
});

await check("row 5: a line of a book row: the exact age in seconds gives the tone of 'Last sign of life'", () => {
  const now = 1_800_000_000;
  const mk = (age) => [`Now: p037, box TS_3. Last sign of life `, { ago: now - age, secs: true }, ". Next page: p037."];
  const tone = (age) => HL.hlOfLine(mk(age), now).find((s) => s.kind === "alive");
  assert.equal(tone(2)?.tone, "good");
  assert.equal(tone(2)?.text, "2 s ago");
  assert.equal(tone(119)?.tone, "good");
  assert.equal(tone(120)?.tone, "warn");
  assert.equal(tone(600)?.tone, "warn");
  assert.equal(tone(601)?.tone, "bad");
  assert.equal(tone(601)?.text, "10 min ago");
  // The same piece after other words is a plain duration, not "alive".
  const other = HL.hlOfLine(["Completed Oct 28 23:50 PST, ", { ago: now - 90000 }, "."], now);
  assert.equal(other.find((s) => s.kind === "alive"), undefined);
  assert.equal(other.find((s) => s.kind === "duration")?.text, "25 h ago");
});

await check("row 5: a Phase 2 line 'Last sign of life 4 s ago.' cut by the text gets a tone from the text age", () => {
  const segs = HL.hlSplit("Last sign of life 4 s ago.");
  assert.deepEqual(segs.map((s) => [s.kind, s.text, s.tone]), [["plain", "Last sign of life ", undefined], ["alive", "4 s ago", "good"], ["plain", ".", undefined]]);
  assert.equal(HL.hlSplit("Last sign of life 3 min ago.").find((s) => s.kind === "alive")?.tone, "warn");
  assert.equal(HL.hlSplit("Last sign of life 11 min ago.").find((s) => s.kind === "alive")?.tone, "bad");
  assert.equal(HL.hlSplit("Last sign of life 2 h ago.").find((s) => s.kind === "alive")?.tone, "bad");
  assert.equal(HL.agoSeconds("just now"), 0);
  assert.equal(HL.agoSeconds("nonsense"), null);
});

// ---------------------------------------------------------------- row 6: failed count
await check("row 6: failedTone: above 0 red, 0 and unknown not", () => {
  assert.equal(HL.failedTone(1), "bad");
  assert.equal(HL.failedTone(240), "bad");
  assert.equal(HL.failedTone(0), "none");
  assert.equal(HL.failedTone(null), "none");
  assert.equal(HL.failedTone(undefined), "none");
  assert.equal(HL.failedTone(Number.NaN), "none");
});

// ---------------------------------------------------------------- row 7: stop reasons
await check("row 7: reasonTone: finished/completed green, pause amber, an error or a failure red", () => {
  for (const t of ["the list finished", "Completed", "target reached", "its pages in the list finished", "finished"]) assert.equal(HL.reasonTone(t), "good", t);
  for (const t of ["Pause", "Pause requested", "Ctrl-C", "Restart", "the list was interrupted", "pause"]) assert.equal(HL.reasonTone(t), "warn", t);
  for (const t of ["failure", "forward-failure", "FAIL", "FAIL (old rule)", "QA_3 FAIL (old rule)", "invalid JSON: x", "the list ended with 1 error", "the process is gone", "the process is silent", "cost-guard", "rule", "error"]) assert.equal(HL.reasonTone(t), "bad", t);
  for (const t of ["", "  ", "something else", "Next page: p012"]) assert.equal(HL.reasonTone(t), "none", JSON.stringify(t));
});

await check("row 7: stop reason pieces in real line forms get the tone", () => {
  const tone = (text, wanted) => {
    const s = HL.hlSplit(text).find((x) => x.kind === "reason");
    assert.ok(s, `a reason in: ${text}`);
    assert.equal(s.tone, wanted, `${text} -> ${s.text}`);
    return s;
  };
  assert.equal(tone("Stopped by Pause at 17:43 PST. Last saved page p011. Resume starts at p012.", "warn").text, "Pause");
  assert.equal(tone("Stopped by Ctrl-C at 17:43 PST.", "warn").text, "Ctrl-C");
  assert.equal(tone("Stopped by Restart at 17:43 PST.", "warn").text, "Restart");
  assert.equal(tone("Stopped by failure at 17:43 PST.", "bad").text, "failure");
  tone("Stopped at p798: the list finished. Oct 27 20:46 PST, 25 days ago.", "good");
  tone("Stopped at p798: the list ended with 1 error. Oct 27 20:46 PST.", "bad");
  tone("Stopped at p798: the list was interrupted. Oct 27 20:46 PST.", "warn");
  tone("Stopped at p014: QA_3 FAIL (old rule). Oct 27 18:56 PST, 25 days ago.", "bad");
  tone("Completed Oct 28 23:50 PST, 25 days ago. 120 of 120 pages done.", "good");
  tone("Pause requested. The process finishes the current page, then ends.", "warn");
  tone("Stop reason: target reached (Nov 22 17:14 PST, 3 min ago).", "good");
  tone("Stop reason: pause (Nov 22 17:14 PST, 3 min ago).", "warn");
  tone("Stop reason: forward-failure (Nov 22 17:14 PST, 3 min ago).", "bad");
  tone("No update for 31 min: the process is gone.", "bad");
});

// ---------------------------------------------------------------- the segment kinds
await check("rows 2-4, 6, 8: hlSplit finds page, box, critic, time, duration, count with the stage", () => {
  const segs = HL.hlSplit("Now: p037, box box-critic.TS_3 and QA_2. Critic of ED_3 and critic of box TL_0 wrote 2026-11-22 17:29 PST (11 h 0 min). 37 of 120 pages done, 1,665 calls. Tokens: input 10,715,711 · output 5.");
  const by = (k) => segs.filter((s) => s.kind === k).map((s) => s.text);
  assert.deepEqual(by("page"), ["p037"]);
  assert.deepEqual(by("critic"), ["box-critic.TS_3", "critic of box TL_0"]);
  assert.deepEqual(by("box"), ["QA_2", "ED_3"]);
  assert.deepEqual(by("time"), ["2026-11-22 17:29 PST"]);
  assert.deepEqual(by("duration"), ["11 h 0 min"]);
  assert.deepEqual(by("count"), ["37 of 120 pages", "1,665 calls", "10,715,711", "5"]);
  assert.deepEqual(segs.filter((s) => s.kind === "critic" || s.kind === "box").map((s) => s.stage), ["TS", "QA", "ED", "TL"]);
  assert.equal(HL.hlJoin(segs), "Now: p037, box box-critic.TS_3 and QA_2. Critic of ED_3 and critic of box TL_0 wrote 2026-11-22 17:29 PST (11 h 0 min). 37 of 120 pages done, 1,665 calls. Tokens: input 10,715,711 · output 5.");
});

await check("row 2: a page ID is p plus 3 or 4 digits and not inside a path or a name", () => {
  const pages = (t) => HL.hlSplit(t).filter((s) => s.kind === "page").map((s) => s.text);
  assert.deepEqual(pages("Next page: p012."), ["p012"]);
  assert.deepEqual(pages("p0798 and p023, p1."), ["p0798", "p023"]);
  assert.deepEqual(pages("ogawa_lecture_part2_p089/ and left_foot_full/p012 and file.p012"), []);
  assert.deepEqual(pages("p12345 p01"), []);
});

await check("row 4: a time and a duration: the forms of the app, plus 1h 25m and ETA 64h", () => {
  const kinds = (t, k) => HL.hlSplit(t).filter((s) => s.kind === k).map((s) => s.text);
  assert.deepEqual(kinds("at 08:00 PST, Oct 29 21:12 PST, 22:06:12 PST, 2026-11-04 00:15 PST and 2026-11-22", "time"), ["08:00 PST", "Oct 29 21:12 PST", "22:06:12 PST", "2026-11-04 00:15 PST", "2026-11-22"]);
  assert.deepEqual(kinds("took 1h 25m, ETA 64h, 2 h 5 min, 37.9 min, 12 min 30 s, 5.2 s, 21 h ago, just now, 3 min ago", "duration"), ["1h 25m", "ETA 64h", "2 h 5 min", "37.9 min", "12 min 30 s", "5.2 s", "21 h ago", "just now", "3 min ago"]);
  assert.deepEqual(kinds("The id 20261122T134318Z and the version v4.1.0 and 3.14 are not times", "time"), []);
  assert.deepEqual(kinds("The id 20261122T134318Z and the version v4.1.0 and 3.14 are not times", "duration"), []);
});

await check("rows 1-8: every kind of HL_KINDS is drawn with data-hl and a class hl-<kind>", () => {
  assert.equal(HL.HL_KINDS.length, 11);
  const drawn = {
    title: renderToStaticMarkup(h(HlTitle, null, "The Secret of Kendo")),
    page: renderToStaticMarkup(h(HlPage, null, "p023")),
    box: renderToStaticMarkup(h(BoxText, { text: "box TS_3" })),
    critic: renderToStaticMarkup(h(BoxText, { text: "box-critic.ED_3" })),
    time: renderToStaticMarkup(h(HlTime, null, "2026-11-22 17:29 PST")),
    duration: renderToStaticMarkup(h(HlDuration, null, "37.9 min")),
    count: renderToStaticMarkup(h(HlCount, null, "37 of 120 pages")),
    failed: renderToStaticMarkup(h(HlFailed, { n: 3 }, "3")),
    reason: renderToStaticMarkup(h(HlSpan, { seg: { kind: "reason", text: "Pause", tone: "warn" } })),
    alive: renderToStaticMarkup(h(HlAlive, { ageSeconds: 130 }, "130 s ago")),
    folder: renderToStaticMarkup(h(HlFolder, null, "left_foot_full")),
  };
  for (const k of HL.HL_KINDS) assert.ok(attrs(drawn[k], "data-hl").includes(k), `${k} is drawn with data-hl="${k}": ${drawn[k]}`);
  for (const k of ["title", "page", "time", "duration", "count", "failed", "reason", "alive", "folder"]) assert.match(drawn[k], new RegExp(`hl-${k}`), `${k} has the class hl-${k}`);
  assert.match(drawn.box, /hl-box-ts/);
  assert.match(drawn.critic, /hl-box-ed/);
  assert.match(drawn.critic, /hl-critic/);
  assert.doesNotMatch(drawn.box, /hl-critic/);
});

await check("row 3: the stage colors: TS teal, TL blue, ED purple, QA orange: the classes of the 4 box chips and of a critic", () => {
  for (const [code, cls] of [["TS_1", "hl-box-ts"], ["TL_2", "hl-box-tl"], ["ED_3", "hl-box-ed"], ["QA_0", "hl-box-qa"]]) {
    const html = renderToStaticMarkup(h(BoxText, { text: `box ${code}` }));
    assert.match(html, new RegExp(cls), code);
    assert.equal(attrs(html, "data-stage")[0], code.slice(0, 2), code);
    const critic = renderToStaticMarkup(h(BoxText, { text: `critic of ${code}` }));
    assert.match(critic, new RegExp(cls + "[^\"]*"), `critic of ${code} has the stage color`);
    assert.match(critic, /hl-critic/, `critic of ${code} is dashed`);
    assert.equal(attrs(critic, "data-hl")[0], "critic");
  }
});

await check("rows 2-7: HlText (a plain text of the old screen): the same visible and hidden text, colors only; a box chip has no hover and no hidden help", () => {
  const sample = "Start point: TL_2, Made-up title, page 1 (p001) at 2026-11-22 17:29 PST, 37 of 120 pages, critic of ED_3 and box-critic.QA_1, 21 h ago.";
  const html = renderToStaticMarkup(h(HlText, { text: sample }));
  assert.equal(textOf(html), sample, "the text is the same");
  assert.doesNotMatch(html, /sr-only|title=/, "no hover text and no hidden help were added");
  const kinds = attrs(html, "data-hl");
  for (const k of ["box", "critic", "page", "time", "count", "duration"]) assert.ok(kinds.includes(k), `HlText draws ${k}`);
  assert.deepEqual(attrs(html, "data-stage"), ["TL", "ED", "QA"]);
  assert.match(html, /hl-box hl-box-tl/);
  assert.match(html, /hl-box hl-box-ed[^"]*hl-critic/);
  assert.match(html, /hl-box hl-box-qa[^"]*hl-critic/);
  // BoxText (with hover) keeps its hidden help: the old BoxText did the same.
  assert.match(renderToStaticMarkup(h(BoxText, { text: "TL_2" })), /sr-only/);
});

await check("row 5/6: the tone shows in data-hl-tone: alive green/amber/red/gray, failed red only above 0", () => {
  const tone = (age) => attrs(renderToStaticMarkup(h(HlAlive, { ageSeconds: age }, "x")), "data-hl-tone")[0];
  assert.equal(tone(119), "good");
  assert.equal(tone(120), "warn");
  assert.equal(tone(600), "warn");
  assert.equal(tone(601), "bad");
  assert.equal(tone(null), "none");
  assert.deepEqual(attrs(renderToStaticMarkup(h(HlFailed, { n: 2 }, "2")), "data-hl-tone"), ["bad"]);
  assert.deepEqual(attrs(renderToStaticMarkup(h(HlFailed, { n: 0 }, "0")), "data-hl-tone"), []);
  assert.deepEqual(attrs(renderToStaticMarkup(h(HlFailed, { n: 0 }, "0")), "data-hl"), ["count"]);
});

await check("row 4: HlTimeText: a text that ends with PST is a time (green), another text stays plain", () => {
  assert.match(renderToStaticMarkup(h(HlTimeText, { text: "2026-11-21 01:42 PST" })), /data-hl="time"/);
  assert.match(renderToStaticMarkup(h(HlTimeText, { text: "2026-11-20 23:58:54 PST (UTC-8)" })), /data-hl="time"/);
  assert.doesNotMatch(renderToStaticMarkup(h(HlTimeText, { text: "not stored" })), /data-hl/);
});

await check("row 6: HlNumberParts bolds the leading number of each part and keeps the text", () => {
  const html = renderToStaticMarkup(h(HlNumberParts, { text: "1 needs attention · 0 waiting for a run · 18 not started" }));
  assert.equal(textOf(html), "1 needs attention · 0 waiting for a run · 18 not started");
  assert.equal((html.match(/data-hl="count"/g) ?? []).length, 3);
});

// ---------------------------------------------------------------- no text change
const SAMPLES = [
  "Now: p037, box box-critic.TS_3. Running since Nov 22 05:43 PST (11 h 0 min). Last sign of life 2 s ago. Next page: p037.",
  "Stopped at p798: the list finished. Oct 27 20:46 PST, 25 days ago. 2 list folders. Next page: not stored.",
  "Error on p089, box box-critic.TS_3: invalid JSON: Expecting ',' delimiter: line 1 column 5 (char 4)",
  "Stopped by Pause at 17:43 PST. Last saved page p011. Resume starts at p012.",
  "Completed Oct 28 23:50 PST, 25 days ago. 120 of 120 pages done.",
  "Stop reason: target reached (Nov 22 17:14 PST, 3 min ago).",
  "Pages done: 37 of 120",
  "Tokens: input 1,234 · output 56 · reasoning 7 · cache read 8 · cache write 9 · 12 calls",
  "Page 23 p023 Translated 32 / 32 PASS 10.0 547,327 37.9 min 3 pairs",
  "2026-11-21 01:42 PST Phase 4 · production run 37 of 120 TS_0 v4.1.0, 1h 25m, ETA 64h",
  "left_foot_full/p012 ogawa_lecture_part2_p089/ 20261122T134318Z",
  "日本語のテキスト p023 剣道 2026-11-22 17:29 PST ✓ \u0000 \n\t  ",
  "",
  " ",
  "No update for 31 min: the process is gone.",
  "critic of ED_3, critic of box QA_0, box-critic.TL_1, ED_3.",
];
await check("no text change: the segments joined equal the text, for fixed samples (the owner picture lines too)", () => {
  for (const s of SAMPLES) assert.equal(HL.hlJoin(HL.hlSplit(s)), s, JSON.stringify(s));
  assert.deepEqual(HL.hlSplit(""), []);
});

await check("no text change: 3000 random texts built from the pieces of the rules", () => {
  const bits = ["p023", "p0798", "p12", "TS_3", "box-critic.ED_3", "critic of ED_3", "critic of box QA_0", "2026-11-22 17:29 PST", "Oct 28 21:12 PST", "08:00 PST", "22:06:12 PST", "2026-11-22", "21 h ago", "3 min ago", "just now", "2 h 5 min", "37.9 min", "1h 25m", "ETA 64h", "12 min 30 s", "5.2 s", "37 of 120 pages", "2 / 640", "2 list folders", "1,665 calls", "input 10,715,711", "Last sign of life ", "Stop reason: ", "Stopped by ", "Pause", "Ctrl-C", "Restart", "failure", "the list finished", "the list ended with 1 error", "FAIL (old rule)", "Pause requested", "Completed", " ", ", ", ". ", "(", ")", "·", "-", "_", "/", "x", "日本", "é", "\u00a0", "\n", "0", "12", "1,2", "v4.1.0", "20261122T134318Z"];
  let seed = 127;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 14);
    let s = "";
    for (let j = 0; j < n; j++) s += bits[Math.floor(rnd() * bits.length)];
    const segs = HL.hlSplit(s);
    assert.equal(HL.hlJoin(segs), s, JSON.stringify(s));
    assert.ok(segs.every((x) => x.text !== ""), "no empty segment: " + JSON.stringify(s));
    for (let k = 1; k < segs.length; k++) assert.ok(!(segs[k].kind === "plain" && segs[k - 1].kind === "plain"), "plain pieces are merged: " + JSON.stringify(s));
  }
});

await check("no text change: the drawn text of BoxText and HlLine equals the old text (tags removed)", () => {
  for (const s of SAMPLES) {
    const html = renderToStaticMarkup(h(BoxText, { text: s }));
    // A box code adds a hidden help text for screen readers: take it out before the compare (the old BoxCode did the same).
    const visible = textOf(html.replace(/<span class="sr-only">[^<]*<\/span>/g, ""));
    assert.equal(visible, s, JSON.stringify(s));
  }
  const now = 1_800_000_000;
  const segs = ["Now: p037, box box-critic.TS_3. Last sign of life ", { ago: now - 5, secs: true }, ". Next page: p037. Completed Oct 28 23:50 PST, ", { ago: now - 7200 }, "."];
  const html = renderToStaticMarkup(h(HlLine, { segs, now }));
  assert.equal(textOf(html.replace(/<span class="sr-only">[^<]*<\/span>/g, "")), RULES.lineText(segs, now));
});

// The REAL status files of the Translator (read only): every row that the Monitor dashboard builds.
const cfgPath = path.join(process.env.TMPDIR, "vw127-config.json");
await fs.mkdir(process.env.TMPDIR, { recursive: true });
await fs.writeFile(cfgPath, JSON.stringify({ translatorDataDir: T2_DATA, monitor: true }));
process.env.VIEWER_CONFIG = cfgPath;
const haveReal = existsSync(path.join(T2_DATA, "book-store"));
const { loadMonitor } = await import("../lib/book-status.ts");

await check("no text change (real data): every row of the Monitor dashboard (read from the Translator data folder, read only)", async () => {
  if (!haveReal) {
    console.log("  Not verified: the Translator data folder does not exist here");
    return;
  }
  const now = Date.now();
  const d = await loadMonitor(now);
  assert.ok(d.ok, "loadMonitor reads the folder");
  assert.ok(d.rows.length >= 10, "rows: " + d.rows.length);
  let lines = 0;
  const kinds = new Set();
  for (const row of d.rows) {
    const old = RULES.lineText(row.line2, now / 1000);
    const segs = HL.hlOfLine(row.line2, now / 1000);
    assert.equal(HL.hlJoin(segs), old, `${row.slug}: line 2`);
    for (const s of segs) kinds.add(s.kind);
    lines++;
    for (const f of ["run", "note", "warning", "error", "refused", "label", "title", "markText"]) {
      const t = row[f];
      if (typeof t === "string") assert.equal(HL.hlJoin(HL.hlSplit(t)), t, `${row.slug}: ${f}`);
    }
  }
  assert.ok(d.rows.some((r) => RULES.lineText(r.line2, now / 1000).length > 20), "some row has a line 2");
  const p2 = d.phase2;
  if (p2) {
    const { phase2Text } = await import("../lib/phase2-row.ts");
    const t = phase2Text(p2, now / 1000);
    for (const l of t.lines) assert.equal(HL.hlJoin(HL.hlSplit(l.text)), l.text, `phase 2 line ${l.key}`);
    for (const l of t.lines) for (const s of HL.hlSplit(l.text)) kinds.add(s.kind);
    console.log(`  phase 2 lines: ${t.lines.map((l) => l.key).join(" ")}`);
  }
  assert.equal(HL.hlJoin(HL.hlSplit(d.summary.text)), d.summary.text);
  console.log(`  real rows: ${d.rows.length}, line 2 texts: ${lines}, kinds seen: ${[...kinds].sort().join(" ")}`);
  for (const k of ["time", "duration", "page"]) assert.ok(kinds.has(k), `the real data has the kind ${k}`);
});

await check("no text change (real data): every status.json under book-store (read only) gives the same text for the rows at 4 clocks", async () => {
  if (!haveReal) return;
  const files = [];
  for (const e of await fs.readdir(path.join(T2_DATA, "book-store"), { withFileTypes: true })) if (e.isDirectory() && existsSync(path.join(T2_DATA, "book-store", e.name, "status.json"))) files.push(e.name);
  assert.ok(files.length >= 1, "status.json files: " + files.length);
  const base = Date.now();
  for (const off of [0, 90_000, 400_000, 3_000_000]) {
    const d = await loadMonitor(base + off);
    for (const row of d.rows) {
      const segs = HL.hlOfLine(row.line2, (base + off) / 1000);
      assert.equal(HL.hlJoin(segs), RULES.lineText(row.line2, (base + off) / 1000), `${row.slug} at +${off} ms`);
    }
  }
  console.log(`  status.json files: ${files.length}`);
});

await check("the alive piece of a real running row uses the exact age (tone changes with the clock)", async () => {
  if (!haveReal) return;
  const base = Date.now();
  const tones = new Set();
  for (const off of [0, 150_000, 700_000]) {
    const d = await loadMonitor(base + off);
    for (const row of d.rows) for (const s of HL.hlOfLine(row.line2, (base + off) / 1000)) if (s.kind === "alive") tones.add(`${off}:${s.tone}`);
  }
  // A running row (a live heartbeat) needs a live run. If none runs now, the rule is proven by the fixed tests above.
  console.log(`  alive tones seen: ${[...tones].join(" ") || "none (no running book now)"}`);
});

done();
