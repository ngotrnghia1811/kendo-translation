// VW116 (round 104, card P51.1): server-free tests of the 4 rows that Q-A 3:95.4 accepted.
// Owner words (Q-A 3:93.5): "I want to be able to resize every panel ... by dragging the borders/corners. Also I want to be able to go to prev/next book page.
// These features should also apply to every other relevant reader/monitor pages." Rule line accepted in Q-A 3:95.7 (docs/agents/viewer.md, Screens).
//   part 1  row a: the arrow keys on /translate/<book> (lib/translate-page-keys.ts, components/useTranslatePageKeys.ts, components/HtvBook.tsx)
//   part 2  row b: the theme choice keeps one line from 1280 px (components/ThemeSwitch.tsx)
//   part 3  row c: the first-visit box leaves the right edge, the owner rules stay (components/ReaderSettingsPanel.tsx, components/ReaderBook.tsx)
//   part 4  row d: the 2 old code checker faults are gone and the 2 files change nothing else (components/TrainingMonitor.tsx, components/BookDetailView.tsx)
// Run: node scripts/vw116-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed". Made-up data only. No network.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/translate/made-up-book");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");

const K = await import("../lib/translate-page-keys.ts");
const M = await import("../lib/page-move.ts");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
/** A made-up key target. `match`: a part of the selector that the target matches with `closest`. */
const target = (match = "") => ({ isContentEditable: false, closest: (sel) => (match && sel.includes(match) ? {} : null) });
const key = (k, extra = {}) => ({ key: k, target: target(), ...extra });

// ---------------------------------------------------------------- part 1: row a, the arrow keys on /translate/<book>

await check("row a: Right gives the next page and Left gives the previous page, from the page now", () => {
  assert.equal(K.translateKeyTarget(key("ArrowRight"), 5, 10, false), 6);
  assert.equal(K.translateKeyTarget(key("ArrowLeft"), 5, 10, false), 4);
  assert.equal(K.translateKeyTarget(key("ArrowRight"), 1, 10, false), 2);
  assert.equal(K.translateKeyTarget(key("ArrowLeft"), 10, 10, false), 9);
});

await check("row a: no move past the first or the last page, so the browser keeps its key (same as the disabled buttons)", () => {
  assert.equal(K.translateKeyTarget(key("ArrowLeft"), 1, 10, false), null);
  assert.equal(K.translateKeyTarget(key("ArrowRight"), 10, 10, false), null);
  assert.equal(K.translateKeyTarget(key("ArrowRight"), 1, 1, false), null, "a book of one page");
  assert.equal(K.translateKeyTarget(key("ArrowLeft"), 1, 1, false), null);
});

await check("row a: other keys, Shift, Alt, Ctrl, Meta, a held key, a text composition and a handled key do nothing", () => {
  for (const k of ["ArrowUp", "ArrowDown", "a", "Enter", "PageDown", "Home"]) assert.equal(K.translateKeyTarget(key(k), 5, 10, false), null, k);
  for (const extra of [{ shiftKey: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { repeat: true }, { isComposing: true }, { defaultPrevented: true }]) {
    assert.equal(K.translateKeyTarget(key("ArrowRight", extra), 5, 10, false), null, JSON.stringify(extra));
  }
});

await check("row a: a text box, a textarea (the translator writes there), a select, a slider, a resize handle, a list, a menu and editable text keep their keys", () => {
  for (const sel of ["input", "textarea", "select", "[role=slider]", "[role=separator]", "[role=listbox]", "[role=menu]"]) {
    assert.equal(K.translateKeyTarget({ key: "ArrowRight", target: target(sel) }, 5, 10, false), null, sel);
    assert.equal(K.translateKeyTarget({ key: "ArrowLeft", target: target(sel) }, 5, 10, false), null, sel);
  }
  assert.equal(K.translateKeyTarget({ key: "ArrowRight", target: { isContentEditable: true, closest: () => null } }, 5, 10, false), null);
  assert.equal(K.translateKeyTarget({ key: "ArrowRight", target: null }, 5, 10, false), 6, "no target (the page itself) gives a move");
  // A button does not use the arrow keys, so the keys work while Previous page or Next page has the focus.
  assert.equal(K.translateKeyTarget({ key: "ArrowRight", target: target("button") }, 5, 10, false), 6);
});

await check("row a: while a pop-up is open (term pop-up, cog box) the keys do nothing, as on /read", () => {
  assert.equal(K.translateKeyTarget(key("ArrowRight"), 5, 10, true), null);
  assert.equal(K.translateKeyTarget(key("ArrowLeft"), 5, 10, true), null);
});

await check("row a: the rule is the one copy in lib/page-move.ts: the Left and Right names are not written again, and the key constants are used by the other 3 views", () => {
  const keysFile = noComments(read("lib/translate-page-keys.ts"));
  const hookFile = noComments(read("components/useTranslatePageKeys.ts"));
  assert.ok(/from "\.\/page-move"/.test(keysFile) && /pageKeyDirection/.test(keysFile), "the key rule comes from lib/page-move.ts");
  assert.ok(!/Arrow(Left|Right)/.test(keysFile) && !/Arrow(Left|Right)/.test(hookFile), "no second copy of the key names");
  assert.ok(!/const PAGE_KEYS|function ownsArrowKeys|function pageKeyDirection/.test(keysFile + hookFile + noComments(read("components/HtvBook.tsx"))));
  assert.equal(M.PAGE_KEYS.previous, "ArrowLeft");
  assert.equal(M.PAGE_KEYS.next, "ArrowRight");
  for (const f of ["components/ReaderBook.tsx", "components/PageMoveLinks.tsx"]) assert.ok(/from "@\/lib\/page-move"/.test(read(f)), f);
  // The hook asks the same function with the same key event that ReaderBook uses (default tab rule).
  assert.ok(/translateKeyTarget\(e, cur, pages, dialogOpen\)/.test(hookFile));
});

await check("row a: HtvBook uses the hook in the Page view only, with the same move function as the buttons, and the buttons carry the shared titles", () => {
  const src = read("components/HtvBook.tsx");
  assert.ok(/import \{ useTranslatePageKeys \} from "\.\/useTranslatePageKeys";/.test(src));
  assert.ok(/import \{ NEXT_TITLE, PREVIOUS_TITLE \} from "@\/lib\/page-move";/.test(src));
  assert.ok(/useTranslatePageKeys\(view === "page", cur, pages, movePage\);/.test(src), "Page view only, same movePage as the buttons");
  assert.ok(/onClick=\{\(\) => onMove\(cur - 1\)\} title=\{PREVIOUS_TITLE\} data-page-prev=\{where\}/.test(src));
  assert.ok(/onClick=\{\(\) => onMove\(cur \+ 1\)\} title=\{NEXT_TITLE\} data-page-next=\{where\}/.test(src));
  assert.equal(M.PREVIOUS_TITLE, "Previous page (Left arrow key)");
  assert.equal(M.NEXT_TITLE, "Next page (Right arrow key)");
  // The call sits after movePage (which holds the warning about unsaved text), so a key asks the same question as a click.
  assert.ok(src.indexOf("const movePage = useCallback(") < src.indexOf("useTranslatePageKeys(view"));
  assert.ok(/if \(!confirmLeave\(\)\) return;\n\s+\/\/ The page that the screen leaves loads again/.test(src), "movePage still asks before it leaves unsaved text");
});

await check("row a: the hook adds one key listener on the window when it is on, and removes it in the cleanup", () => {
  const src = noComments(read("components/useTranslatePageKeys.ts"));
  assert.ok(/if \(!enabled\) return;/.test(src));
  assert.ok(/window\.addEventListener\("keydown", onKey\);/.test(src) && /window\.removeEventListener\("keydown", onKey\);/.test(src));
  assert.ok(/document\.querySelector\('\[role="dialog"\]'\) !== null/.test(src));
  assert.ok(/e\.preventDefault\(\);\n\s+onMove\(to\);/.test(src), "the browser key is stopped only when a move happens");
});

// ---------------------------------------------------------------- part 2: row b, the theme choice

const T = await import("../components/ThemeSwitch.tsx");
const S = await import("../lib/htv-settings.ts");

await check("row b: the theme choice keeps the 5 themes and their names, one pressed mark, as buttons in a group", () => {
  const html = renderToStaticMarkup(h(T.default, { theme: "sepia" }));
  const buttons = html.match(/<button[^>]*>[^<]*<\/button>/g) ?? [];
  assert.equal(buttons.length, 5);
  assert.deepEqual(
    buttons.map((b) => b.replace(/<[^>]+>/g, "")),
    ["Light", "High-contrast dark", "Sepia", "Solarized light", "Solarized dark"],
  );
  assert.equal(S.THEME_NAMES.length, 5);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /aria-pressed="true"[^>]*>Sepia</);
  assert.ok(/role="group" aria-label="Color theme"/.test(html) && /data-theme-switch/.test(html));
  assert.ok(buttons.every((b) => /type="button"/.test(b)), "plain buttons: Tab and Enter work as before");
});

await check("row b: from 1280 px (Tailwind xl) the group does not wrap and does not shrink. Below 1280 px it wraps as before", () => {
  const html = renderToStaticMarkup(h(T.default, { theme: "light" }));
  const cls = (html.match(/<div role="group"[^>]*class="([^"]*)"/) ?? [])[1].split(" ");
  for (const c of ["xl:flex-nowrap", "xl:shrink-0"]) assert.ok(cls.includes(c), c);
  for (const c of ["flex", "flex-wrap", "ml-auto", "overflow-hidden"]) assert.ok(cls.includes(c), `old class ${c} stays: ${c}`);
  // Every new class is from xl up, so no width below 1280 px changes (the phone menu at 390 px and the wrap at 768 to 1279 px stay).
  const added = cls.filter((c) => /shrink-0|flex-nowrap/.test(c));
  assert.ok(added.every((c) => c.startsWith("xl:")), added.join(" "));
});

await check("row b: the Nav bar file is unchanged in its class lists (the VW100 test pins them), the phone menu button stays", () => {
  const nav = read("components/Nav.tsx");
  assert.ok(nav.includes('"border-b border-line bg-band text-band-ink px-6 flex flex-wrap md:flex-nowrap items-end gap-x-8"'));
  assert.ok(read("components/NavMenuButton.tsx").includes("md:hidden"));
});

// ---------------------------------------------------------------- part 3: row c, the first-visit box

const P = await import("../components/ReaderSettingsPanel.tsx");
const Y = await import("../lib/reader-layout.ts");
const panelHtml = (firstVisit) =>
  renderToStaticMarkup(h(P.default, { s: Y.effectiveSettings({}, "page"), theme: "light", onChange() {}, onTheme() {}, onClose() {}, firstVisit, images: true }));
const classOf = (html) => (html.match(/<div role="dialog"[^>]*class="([^"]*)"/) ?? [])[1].split(" ");

await check("row c: the first-visit box sits at the left edge from 768 px, the box from the cog keeps the right edge", () => {
  const first = classOf(panelHtml(true));
  const cog = classOf(panelHtml(false));
  assert.ok(first.includes("md:left-4") && !first.includes("md:right-4"), "first visit: left edge");
  assert.ok(cog.includes("md:right-4") && !cog.includes("md:left-4"), "cog box: right edge as before");
  assert.equal(P.FIRST_VISIT_SIDE, "md:left-4");
  assert.equal(P.SETTINGS_SIDE, "md:right-4");
  // Same size and place from the top in both modes: width 320 px, top 80 px, up to 85 percent of the screen high on a wide screen.
  for (const c of [first, cog]) for (const k of ["md:w-80", "md:top-20", "md:max-h-[85vh]", "fixed", "z-50", "md:inset-x-auto", "md:bottom-auto"]) assert.ok(c.includes(k), k);
});

await check("row c: the phone sheet is as before (bottom, full width, up to 50 percent high in the first visit, else 85 percent)", () => {
  const first = classOf(panelHtml(true));
  const cog = classOf(panelHtml(false));
  for (const c of [first, cog]) for (const k of ["inset-x-0", "bottom-0", "rounded-t"]) assert.ok(c.includes(k), k);
  assert.ok(first.includes("max-h-[50vh]") && !first.includes("max-h-[85vh]"));
  assert.ok(cog.includes("max-h-[85vh]") && !cog.includes("max-h-[50vh]"));
  // Every new side class is from md up, so the phone layout does not change.
  assert.ok(!first.some((c) => /(^|:)(left|right)-4$/.test(c) && !c.startsWith("md:")));
});

await check("row c: owner rules stay. The first-visit box has Start reading, no Close button, the marker attributes and the same text", () => {
  const first = panelHtml(true);
  assert.ok(/data-first-visit/.test(first) && /data-reader-settings/.test(first) && /data-start-reading/.test(first));
  assert.ok(/Start reading/.test(first) && !/data-settings-close/.test(first));
  assert.ok(/Use the Image button in the bar above the text to show or hide the page image\./.test(first));
  const cog = panelHtml(false);
  assert.ok(!/data-first-visit/.test(cog) && /data-settings-close/.test(cog) && !/data-start-reading/.test(cog));
});

await check("row c: ReaderBook still shows and closes the box by the old rules (round 68 answer 5, round 69 answer 13). The file is not changed by this unit", () => {
  const src = read("components/ReaderBook.tsx");
  assert.ok(src.includes("const firstVisit = at !== null && user.approved && !panelSeen && !linkVisitor;")); // unit VW120: a link visitor never sees the panel
  assert.ok(src.includes("onClose={firstVisit ? closeFirstVisit : () => setShowSettings(false)}"));
  assert.ok(src.includes("save({ panelSeen: true });"));
  assert.ok(/if \(firstVisit\) closeFirstVisit\(\);/.test(src), "Esc closes the first-visit box first");
  assert.ok(!/FIRST_VISIT_SIDE|SETTINGS_SIDE|md:left-4/.test(src), "the placement lives in ReaderSettingsPanel only");
});

// ---------------------------------------------------------------- part 4: row d, the 2 old code checker faults

await check("row d: BookDetailView does not import or use StatePill any more, and VerdictPill stays", () => {
  const src = read("components/BookDetailView.tsx");
  assert.ok(/import \{ VerdictPill \} from "\.\/Pills";/.test(src));
  const code = noComments(src).replace(/\s\/\/ .*$/gm, "").replace(/ListStatePill|PageListStatePill/g, "");
  assert.ok(!/(?<![A-Za-z])StatePill(?![A-Za-z])/.test(code), "no bare StatePill name");
  assert.ok(/<VerdictPill /.test(src));
  assert.ok(/import \{ GroupCode, ListStatePill, PageListStatePill, RawId \} from "\.\/Named";/.test(src), "the other pills stay");
});

await check("row d: the first read of the training monitor starts from a timer of 0 ms, the later reads and the cleanup stay, and no direct state call is left in the effect", () => {
  const src = noComments(read("components/TrainingMonitor.tsx"));
  const from = src.indexOf("const first = setTimeout");
  const effect = from < 0 ? "" : src.slice(from, src.indexOf("}, [refresh]);", from));
  assert.ok(effect.length > 100, "the effect is found");
  assert.ok(/const first = setTimeout\(\(\) => void refresh\(\), 0\);/.test(effect));
  assert.ok(/clearTimeout\(first\);\n\s+clearInterval\(id\);\n\s+document\.removeEventListener\("visibilitychange", onVisible\);/.test(effect));
  assert.ok(/setInterval\(\(\) => \{\n\s+if \(visible\(\)\) void refresh\(\);\n\s+\}, POLL_MS\);/.test(effect), "the poll every POLL_MS stays");
  assert.ok(/document\.addEventListener\("visibilitychange", onVisible\);/.test(effect));
  // No `refresh()` call at the top level of the effect body (4 spaces of indent): every call sits inside a callback (6 spaces or more).
  assert.ok(!/\n {4}void refresh\(\);/.test("\n    " + effect), "a direct call is left in the effect body");
  assert.equal((effect.match(/void refresh\(\)/g) ?? []).length, 3, "three calls: the first timer, the interval and the visibility event");
  assert.ok(/import \{ POLL_MS \} from "\.\/useLive";/.test(src), "the poll time still comes from useLive");
});

await check("row d: the code checker (eslint) reports 0 problems for the 2 old files and the files of this unit", () => {
  const files = [
    "components/TrainingMonitor.tsx",
    "components/BookDetailView.tsx",
    "components/HtvBook.tsx",
    "components/ThemeSwitch.tsx",
    "components/ReaderSettingsPanel.tsx",
    "components/useTranslatePageKeys.ts",
    "lib/translate-page-keys.ts",
  ];
  let out = "";
  try {
    out = execFileSync(path.join(app, "node_modules/.bin/eslint"), files, { cwd: app, encoding: "utf8", env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR } });
  } catch (e) {
    out = String(e.stdout ?? e.message);
    assert.fail("eslint found problems:\n" + out.slice(0, 800));
  }
  assert.equal(out.trim(), "", "no output means no problem");
});

done();
