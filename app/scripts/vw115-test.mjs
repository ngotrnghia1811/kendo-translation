// VW115 (round 103, card P50.1): server-free tests of the resizable panels, the page move, the dark mode link rule and the Loading pop-up.
// Owner words (Q-A 3:93.5): "I want to be able to resize every panel in /page/<book>/<page> by dragging the borders/corners. Also I want to be able to go to prev/next
// book page. These features should also apply to every other relevant reader/monitor pages." "There are some invisible white text on yellow background in dark mode."
// "Add some transition pop-up (loading ...) to make the page some smoother". Accepted design rows 1 to 8: Q-A 3:94.2.
//   part 1  size rules (lib/panel-size.ts): clamp, reset, storage keys, drag, keys, grid columns
//   part 2  page move rules (lib/page-move.ts): key rules, neighbor choice with gaps and ends
//   part 3  the neighbor loader (lib/page-neighbors.ts) on a made-up data folder
//   part 4  Loading pop-up rules (lib/loading-rule.ts) and the component
//   part 5  the components as HTML: PagePanels, PageMoveLinks
//   part 6  the CSS: link rule in a layer, pop-up rules, contrast of the new pairs in all 5 themes
// Run: node scripts/vw115-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed".
// Made-up data only: a made-up data folder below TMPDIR. No network, no PocketBase, no model call.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
const { root, w } = await madeUpRoot("vw115-");
// The made-up data folder. The config file points the loaders at it.
await w("data/pilot-sample/book-slugs.json", {});
await w("cfg/viewer.config.json", { translatorDataDir: path.join(root, "data"), monitor: true });
process.env.VIEWER_CONFIG = path.join(root, "cfg/viewer.config.json");
installAppHooks(app, "/page/kodass200/p007");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");

const S = await import("../lib/panel-size.ts");
const M = await import("../lib/page-move.ts");
const L = await import("../lib/loading-rule.ts");

// ---------------------------------------------------------------- part 1: size rules

await check("sizes: clampTo rounds and keeps a value between min and max", () => {
  assert.equal(S.clampTo(250.4, 200, 1200), 250);
  assert.equal(S.clampTo(10, 200, 1200), 200);
  assert.equal(S.clampTo(99999, 200, 1200), 1200);
});

await check("sizes: the storage key names the screen and the panel, so each screen has its own set (row 2)", () => {
  assert.equal(S.sizeKey("page", "qa"), "vw115:size:page:qa");
  const keys = new Set(["image", "text", "qa"].map((p) => S.sizeKey("page", p)).concat(["row"].map((p) => S.sizeKey("read", p)), ["index", "tl3"].map((p) => S.sizeKey("translate", p))));
  assert.equal(keys.size, 6);
});

await check("sizes: parseSize gives no size for a missing, broken or wrong value, and clamps a stored value", () => {
  assert.deepEqual(S.parseSize(null), {});
  assert.deepEqual(S.parseSize(""), {});
  assert.deepEqual(S.parseSize("{broken"), {});
  assert.deepEqual(S.parseSize("42"), {});
  assert.deepEqual(S.parseSize("null"), {});
  assert.deepEqual(S.parseSize('{"w":"wide","h":null}'), {});
  assert.deepEqual(S.parseSize('{"w":350,"h":500}'), { w: 350, h: 500 });
  assert.deepEqual(S.parseSize('{"w":5,"h":999999}'), { w: S.SIZE_LIMITS.w.min, h: S.SIZE_LIMITS.h.max });
  assert.deepEqual(S.parseSize('{"w":300.6}'), { w: 301 });
  assert.deepEqual(S.parseSize('{"w":1e999}'), {}, "an infinite number is no size");
});

await check("sizes: serializeSize and mergeSize round trip, and a null part sets the old size again", () => {
  assert.equal(S.serializeSize({}), null);
  assert.equal(S.serializeSize({ w: 300 }), '{"w":300}');
  let size = S.mergeSize({}, { w: 320 });
  size = S.mergeSize(size, { h: 400 });
  assert.deepEqual(size, { w: 320, h: 400 });
  assert.deepEqual(S.parseSize(S.serializeSize(size)), size);
  assert.deepEqual(S.mergeSize(size, { w: null }), { h: 400 }, "reset of the width keeps the height");
  assert.deepEqual(S.mergeSize(S.mergeSize(size, { w: null }), { h: null }), {});
  assert.equal(S.serializeSize({}), null, "an empty size removes the key");
  assert.deepEqual(size, { w: 320, h: 400 }, "mergeSize does not change its input");
});

await check("sizes: dragSize adds the move and keeps the limits", () => {
  assert.deepEqual(S.dragSize({ w: 300, h: 400 }, 50, 20), { w: 350, h: 420 });
  assert.deepEqual(S.dragSize({ w: 300, h: 400 }, -500, -900), { w: S.SIZE_LIMITS.w.min, h: S.SIZE_LIMITS.h.min });
  assert.deepEqual(S.dragSize({ w: 300, h: 400 }, 5000, 99999), { w: S.SIZE_LIMITS.w.max, h: S.SIZE_LIMITS.h.max });
  assert.deepEqual(S.dragSize({ w: 300, h: 5088 }, 0, -400), { w: 300, h: 4688 }, "a tall text panel does not snap to the limit at the first move");
  const own = { w: { min: 280, max: 720 }, h: { min: 120, max: 20000 } };
  assert.deepEqual(S.dragSize({ w: 700, h: 400 }, 100, 0, own), { w: 720, h: 400 }, "the Reader width range 280 to 720");
});

await check("sizes: arrow keys on a corner handle: Right and Left change the width, Down and Up the height, Home resets, other keys do nothing", () => {
  assert.deepEqual(S.cornerKey("ArrowRight"), { dw: 16, dh: 0, reset: false });
  assert.deepEqual(S.cornerKey("ArrowLeft"), { dw: -16, dh: 0, reset: false });
  assert.deepEqual(S.cornerKey("ArrowDown"), { dw: 0, dh: 16, reset: false });
  assert.deepEqual(S.cornerKey("ArrowUp"), { dw: 0, dh: -16, reset: false });
  assert.deepEqual(S.cornerKey("Home"), { dw: 0, dh: 0, reset: true });
  assert.equal(S.cornerKey("Enter"), null);
  assert.equal(S.cornerKey("a"), null);
});

await check("sizes: arrow keys on a border handle: a key away from the panel makes it wider, Home resets", () => {
  assert.equal(S.edgeKey("ArrowRight", "right"), 16);
  assert.equal(S.edgeKey("ArrowLeft", "right"), -16);
  assert.equal(S.edgeKey("ArrowLeft", "left"), 16);
  assert.equal(S.edgeKey("ArrowRight", "left"), -16);
  assert.equal(S.edgeKey("Home", "left"), "reset");
  assert.equal(S.edgeKey("ArrowUp", "left"), null);
});

await check("sizes: the grid columns of the Monitor page view keep the old sizes (300, auto, 340) until a width is stored (row 1)", () => {
  assert.equal(S.pageColumns(true, {}), "300px minmax(0,1fr) 340px");
  assert.equal(S.pageColumns(false, {}), "minmax(0,1fr) 340px");
  assert.equal(S.pageColumns(true, { image: { w: 420 }, qa: { w: 260 } }), "420px minmax(0,1fr) 260px");
  assert.equal(S.pageColumns(true, { text: { w: 700 } }), "300px 700px 340px");
  assert.equal(S.pageColumns(false, { image: { w: 420 } }), "minmax(0,1fr) 340px", "the image width counts only when the image shows");
  assert.equal(S.pageColumns(true, { text: { h: 500 } }), "300px minmax(0,1fr) 340px", "a height changes no column");
});

// ---------------------------------------------------------------- part 2: page move rules

const target = (match = "") => ({ isContentEditable: false, closest: (sel) => (match && sel.includes(match) ? {} : null) });
const key = (k, extra = {}) => ({ key: k, target: target(), ...extra });

await check("page keys: Left is previous and Right is next, as on /read (unit RC5)", () => {
  assert.equal(M.PAGE_KEYS.previous, "ArrowLeft");
  assert.equal(M.PAGE_KEYS.next, "ArrowRight");
  assert.equal(M.pageKeyDirection(key("ArrowLeft")), "previous");
  assert.equal(M.pageKeyDirection(key("ArrowRight")), "next");
  assert.equal(M.pageKeyDirection(key("ArrowUp")), null);
  assert.equal(M.pageKeyDirection(key("a")), null);
  assert.equal(M.PREVIOUS_TITLE, "Previous page (Left arrow key)");
  assert.equal(M.NEXT_TITLE, "Next page (Right arrow key)");
});

await check("page keys: a held key, a text composition, a modifier key and a handled key do nothing", () => {
  for (const extra of [{ repeat: true }, { isComposing: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { defaultPrevented: true }]) {
    assert.equal(M.pageKeyDirection(key("ArrowRight", extra)), null, JSON.stringify(extra));
  }
});

await check("page keys: a text box, a select, a slider, a splitter handle, a list and editable text keep their arrow keys", () => {
  for (const sel of ["input", "textarea", "select", "[role=slider]", "[role=separator]", "[role=listbox]", "[role=menu]"]) {
    assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: target(sel) }), null, sel);
  }
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: { isContentEditable: true, closest: () => null } }), null);
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: null }), "next", "no target (the page) gives a move");
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: {} }), "next", "a target without closest gives a move");
});

await check("page keys: the stage tabs of the Monitor page view do not own the keys, the tabs of other screens do", () => {
  const tab = { key: "ArrowRight", target: target("[role=tablist]") };
  assert.equal(M.pageKeyDirection(tab), null, "tabsOwnKeys default true: the Reader tabs keep their keys");
  assert.equal(M.pageKeyDirection(tab, false), "next");
  // The other controls still win when tabs do not own the keys.
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: target("input") }, false), null);
});

await check("page names: pageNumber reads pNNN and nothing else", () => {
  assert.equal(M.pageNumber("p006"), 6);
  assert.equal(M.pageNumber("p6"), 6);
  assert.equal(M.pageNumber("p120"), 120);
  assert.equal(M.pageNumber("page6"), null);
  assert.equal(M.pageNumber("p"), null);
  assert.equal(M.pageNumber("p6x"), null);
  assert.equal(M.pageNumber(""), null);
});

await check("neighbors: candidates are nearest first, in book order, with gaps and at the ends", () => {
  const nums = [1, 2, 4, 7, 8, 8, 12];
  assert.deepEqual(M.neighborCandidates(nums, 7, "previous"), [4, 2, 1]);
  assert.deepEqual(M.neighborCandidates(nums, 7, "next"), [8, 12]);
  assert.deepEqual(M.neighborCandidates(nums, 1, "previous"), []);
  assert.deepEqual(M.neighborCandidates(nums, 12, "next"), []);
  assert.deepEqual(M.neighborCandidates(nums, 5, "next"), [7, 8, 12], "a current page that is not in the list still works");
  assert.deepEqual(M.neighborCandidates([], 3, "next"), []);
});

await check("neighbors: pickNeighbor takes the first page that has a run and gives null at the end of the book", () => {
  const nums = [1, 2, 4, 7, 8, 12];
  const runs = new Set([1, 2, 7, 12]);
  const has = (n) => runs.has(n);
  assert.equal(M.pickNeighbor(nums, 7, "previous", has), 2, "p004 has no run, so the link skips it");
  assert.equal(M.pickNeighbor(nums, 7, "next", has), 12, "p008 has no run");
  assert.equal(M.pickNeighbor(nums, 12, "next", has), null);
  assert.equal(M.pickNeighbor(nums, 1, "previous", has), null);
  assert.equal(M.pickNeighbor(nums, 2, "previous", () => false), null, "no page with a run: no link");
  const asked = [];
  M.pickNeighbor(nums, 12, "previous", (n) => (asked.push(n), n === 7));
  assert.deepEqual(asked, [8, 7], "the search stops at the first page with a run");
});

// ---------------------------------------------------------------- part 3: the neighbor loader

for (const [slug, page, runs] of [
  ["kodass200", "p001", ["20261101T010101Z"]],
  ["kodass200", "p002", ["20261101T020202Z"]],
  ["kodass200", "p004", ["20261102T040404Z"]],
  ["kodass200", "p007", ["20261103T070707Z"]],
  ["kodass200", "p008", ["20261101T080808Z", "20261105T080808Z", "20261103T080808Z"]],
  ["otherbook", "p005", ["20261101T050505Z"]],
  ["otherbook", "p006", ["20261101T060606Z"]],
]) {
  for (const run of runs) await w(`data/pilot-run/${slug}_${page}/${run}/page-summary.json`, { page });
}
// p005 of kodass200 has a folder but no run folder. p006 has no folder at all (a gap).
await w("data/pilot-run/kodass200_p005/notes.txt", "no run here");
await w("data/pilot-run/kodass200_p009/scratch/readme.txt", "a folder that is not a run");
await w("data/pilot-run/not-a-page-folder/20261101T010101Z/x.json", {});

const N = await import("../lib/page-neighbors.ts");

await check("loader: a page in the middle gets the nearest pages that have a run, with the newest run in the address", async () => {
  const n = await N.loadPageNeighbors("kodass200", "p007");
  assert.equal(n.previous, "/page/kodass200/p004?run=20261102T040404Z", "p005 has no run and p006 has no folder");
  assert.equal(n.next, "/page/kodass200/p008?run=20261105T080808Z", "the newest of three runs");
});

await check("loader: the first page has no previous link and the last page has no next link", async () => {
  const first = await N.loadPageNeighbors("kodass200", "p001");
  assert.equal(first.previous, null);
  assert.equal(first.next, "/page/kodass200/p002?run=20261101T020202Z");
  const last = await N.loadPageNeighbors("kodass200", "p008");
  assert.equal(last.next, null, "p009 has a folder with no run, so there is no next page");
  assert.equal(last.previous, "/page/kodass200/p007?run=20261103T070707Z");
});

await check("loader: pages of another book do not count, and a page that is not in the book still finds its neighbors", async () => {
  const other = await N.loadPageNeighbors("otherbook", "p005");
  assert.equal(other.previous, null);
  assert.equal(other.next, "/page/otherbook/p006?run=20261101T060606Z");
  const gap = await N.loadPageNeighbors("kodass200", "p006");
  assert.equal(gap.previous, "/page/kodass200/p004?run=20261102T040404Z");
  assert.equal(gap.next, "/page/kodass200/p007?run=20261103T070707Z");
});

await check("loader: a bad page name or an unknown book gives no links and no error", async () => {
  assert.deepEqual(await N.loadPageNeighbors("kodass200", "page7"), { previous: null, next: null });
  assert.deepEqual(await N.loadPageNeighbors("nobook", "p003"), { previous: null, next: null });
});

// ---------------------------------------------------------------- part 4: Loading pop-up

await check("pop-up: it shows after 0.15 s of a move and never before (row 6)", () => {
  assert.equal(L.LOADING_DELAY_MS, 150);
  assert.equal(L.popupVisible(true, 0), false);
  assert.equal(L.popupVisible(true, 149), false);
  assert.equal(L.popupVisible(true, 150), true);
  assert.equal(L.popupVisible(true, 5000), true);
  assert.equal(L.popupVisible(false, 5000), false, "no move, no pop-up");
});

const here = { origin: "http://localhost:3000", href: "http://localhost:3000/page/kodass200/p007?run=a" };
const prevented = { button: 0, defaultPrevented: true };

await check("pop-up: a click on a router link to another address starts a move", () => {
  assert.equal(L.startsMove(prevented, { href: "http://localhost:3000/page/kodass200/p008?run=b" }, here), true);
  assert.equal(L.startsMove(prevented, { href: "http://localhost:3000/page/kodass200/p007?run=b" }, here), true, "only the search part differs");
  assert.equal(L.startsMove(prevented, { href: "http://localhost:3000/books" }, here), true);
});

await check("pop-up: no move for the same address, a hash only, a new tab, a download, a key click, another site, a click the router did not take", () => {
  const to = (href, extra = {}) => ({ href, ...extra });
  assert.equal(L.startsMove(prevented, to(here.href), here), false, "same address");
  assert.equal(L.startsMove(prevented, to(here.href + "#top"), here), false, "anchor on the same page");
  assert.equal(L.startsMove(prevented, to("http://localhost:3000/books", { target: "_blank" }), here), false);
  assert.equal(L.startsMove(prevented, to("http://localhost:3000/books", { target: "_self" }), here), true);
  assert.equal(L.startsMove(prevented, to("http://localhost:3000/x.zip", { download: true }), here), false);
  for (const k of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) assert.equal(L.startsMove({ ...prevented, [k]: true }, to("http://localhost:3000/books"), here), false, k);
  assert.equal(L.startsMove({ button: 1, defaultPrevented: true }, to("http://localhost:3000/books"), here), false, "middle button");
  assert.equal(L.startsMove(prevented, to("https://example.com/books"), here), false, "another site");
  assert.equal(L.startsMove({ button: 0, defaultPrevented: false }, to("http://localhost:3000/books"), here), false, "the browser loads that page itself");
  assert.equal(L.startsMove(prevented, null, here), false, "no link");
  assert.equal(L.startsMove(prevented, to("not a url"), here), false, "a broken address");
});

await check("pop-up: markNavigating sends the event and does nothing on the server", () => {
  assert.doesNotThrow(() => L.markNavigating());
  const events = [];
  globalThis.window = { dispatchEvent: (e) => events.push(e.type) };
  try {
    L.markNavigating();
  } finally {
    delete globalThis.window;
  }
  assert.deepEqual(events, [L.NAVIGATE_EVENT]);
  assert.equal(L.NAVIGATE_EVENT, "vw115:navigate");
  assert.equal(L.LOADING_GIVE_UP_MS, 30000);
});

const Popup = (await import("../components/LoadingPopup.tsx")).default;

await check("pop-up: the component has role status, the text Loading…, the delay in its style, and no hook", () => {
  const html = renderToStaticMarkup(h(Popup, { route: true }));
  assert.ok(html.includes('role="status"'), html);
  assert.ok(html.includes("Loading…"));
  assert.ok(html.includes("data-route-loading"), "the attribute that the old tests look for");
  assert.ok(html.includes("animation-delay:150ms"), html);
  assert.ok(html.includes('aria-hidden="true"'), "the turning circle is hidden from a screen reader");
  const nav = renderToStaticMarkup(h(Popup, {}));
  assert.ok(nav.includes("data-nav-loading") && !nav.includes("data-route-loading"));
});

await check("pop-up: the 4 loading.tsx files use the shared pop-up and keep the old attribute (route)", () => {
  for (const d of ["read", "translate", "admin", "profile"]) {
    const s = read(`app/${d}/loading.tsx`);
    assert.ok(/import LoadingPopup from "@\/components\/LoadingPopup"/.test(s), d);
    assert.ok(/<LoadingPopup route \/>/.test(s), d);
    assert.ok(!/<p role="status"/.test(s), d + ": the old line is gone");
  }
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes("<NavigationLoading />"), "the layout holds the pop-up for every screen, the Monitor screens too");
});

await check("pop-up: the code-driven moves send the event before router.push", () => {
  for (const f of ["components/ReaderBook.tsx", "components/ReaderIndex.tsx", "components/PageView.tsx", "components/PageMoveLinks.tsx", "components/VectorMapSlider.tsx", "components/TrainingMonitorLink.tsx"]) {
    const s = read(f);
    for (const m of s.matchAll(/router\.push\(/g)) {
      const before = s.slice(Math.max(0, m.index - 140), m.index);
      assert.ok(/markNavigating\(\);\s*$/.test(before), `${f}: a router.push without markNavigating`);
    }
  }
});

// ---------------------------------------------------------------- part 5: the components as HTML

const { default: PagePanels } = await import("../components/PagePanels.tsx");
const { default: PageMoveLinks } = await import("../components/PageMoveLinks.tsx");

await check("PagePanels: with the page image there are 3 panels, 2 border handles and 3 corner handles (row 1)", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: h("img", { src: "x.png", alt: "scan" }), text: h("p", null, "text"), side: h("p", null, "qa") }));
  assert.equal((html.match(/data-page-panel="/g) ?? []).length, 3);
  assert.equal((html.match(/data-page-edge-/g) ?? []).length, 2, "the right edge of the image panel and the left edge of the QA panel");
  assert.equal((html.match(/data-page-corner-/g) ?? []).length, 3);
  assert.ok(html.includes("data-page-edge-image") && html.includes("data-page-edge-qa") && !html.includes("data-page-edge-text"));
  assert.ok(html.includes("--page-cols:300px minmax(0,1fr) 340px"), html.slice(0, 300));
  assert.ok(html.includes("grid-cols-1") && html.includes("lg:[grid-template-columns:var(--page-cols)]"), "stacked below lg, 3 columns from lg (row 7)");
});

await check("PagePanels: without the page image there are 2 panels, 1 border handle and 2 corner handles", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: null, text: h("p", null, "text"), side: h("p", null, "qa") }));
  assert.equal((html.match(/data-page-panel="/g) ?? []).length, 2);
  assert.equal((html.match(/data-page-edge-/g) ?? []).length, 1);
  assert.equal((html.match(/data-page-corner-/g) ?? []).length, 2);
  assert.ok(html.includes("--page-cols:minmax(0,1fr) 340px"));
});

await check("PagePanels: every handle is focusable, has a label, and is hidden below lg (row 7)", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: h("img", { src: "x.png", alt: "scan" }), text: h("p", null, "text"), side: h("p", null, "qa") }));
  const handles = html.match(/<div role="separator"[^>]*>/g) ?? [];
  assert.equal(handles.length, 5);
  for (const t of handles) {
    assert.ok(/tabindex="0"/.test(t), t);
    assert.ok(/aria-label="Drag to change the width/.test(t), t);
    assert.ok(/max-lg:hidden/.test(t), t);
  }
});

await check("PageMoveLinks: two links with the key names in the title, and a grayed span at the end of the book (row 3)", () => {
  const both = renderToStaticMarkup(h(PageMoveLinks, { previous: "/page/b/p001?run=r1", next: "/page/b/p003?run=r3" }));
  assert.ok(both.includes('href="/page/b/p001?run=r1"') && both.includes('href="/page/b/p003?run=r3"'));
  assert.ok(both.includes("Previous page (Left arrow key)") && both.includes("Next page (Right arrow key)"));
  assert.ok(both.includes("data-page-prev") && both.includes("data-page-next") && !both.includes("aria-disabled"));
  const first = renderToStaticMarkup(h(PageMoveLinks, { previous: null, next: "/page/b/p003?run=r3" }));
  assert.ok(/<span[^>]*aria-disabled="true"[^>]*data-page-prev/.test(first), first);
  assert.ok(!/<a [^>]*data-page-prev/.test(first), "the grayed one is no link");
  assert.ok(first.includes('href="/page/b/p003?run=r3"'));
  const none = renderToStaticMarkup(h(PageMoveLinks, { previous: null, next: null }));
  assert.equal((none.match(/aria-disabled="true"/g) ?? []).length, 2);
  assert.ok(!none.includes("href="));
});

await check("PageMoveLinks: the grayed link uses the muted text color and no opacity, so its contrast holds", () => {
  const src = read("components/PageMoveLinks.tsx");
  const gray = /const GRAYED = "([^"]+)"/.exec(src)?.[1] ?? "";
  assert.ok(gray.includes("text-muted") && gray.includes("border-dashed"), gray);
  assert.ok(!/opacity/.test(gray), gray);
});

await check("sources: the Reader page view uses the shared key rule, and the old copy is gone", () => {
  const s = read("components/ReaderBook.tsx");
  assert.ok(s.includes('from "@/lib/page-move"') && s.includes("pageKeyDirection(e)"));
  assert.ok(!/const PAGE_KEYS\s*=/.test(s) && !/function ownsArrowKeys/.test(s));
});

await check("sources: the corner handle is on the Reader panels, the book index and the TL_3 panel, and the old edge handles stay", () => {
  assert.ok(read("components/ReaderPanels.tsx").includes('attr="data-reader-corner"') && read("components/ReaderPanels.tsx").includes('attr="data-reader-handle"'));
  assert.ok(read("components/HtvIndex.tsx").includes('attr="data-index-corner"') && read("components/HtvIndex.tsx").includes('attr="data-index-handle"'));
  const frame = read("components/HtvPanelFrame.tsx");
  assert.ok(frame.includes('attr="data-panel-corner"') && frame.includes('attr="data-panel-handle"') && /corner=("left"|\{edge\})/.test(frame));
  assert.ok(frame.includes("onReset"), "DragHandle has the reset");
});

await check("sources: the reset of the last saved panel width uses the clear list, because the server drops an empty widths object", () => {
  const book = read("components/ReaderBook.tsx");
  assert.ok(/clear:\s*\["widths"\]/.test(book), "the last width goes away with clear");
  const settings = read("lib/htv-settings.ts");
  assert.ok(settings.includes("if (Object.keys(w).length) out.widths = w;"), "the server rule that makes the clear list necessary");
  assert.ok(/LAYOUT_KEYS\s*=\s*\[[^\]]*"widths"/.test(settings), "widths is a layout key that the route can clear");
});

// ---------------------------------------------------------------- part 6: the CSS

const css = read("app/globals.css");
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The names of the at-rules that enclose the character at `index`, from the outside in. */
function enclosing(text, index) {
  const stack = [];
  for (let i = 0; i < index; i++) {
    if (text[i] === "{") {
      const start = Math.max(text.lastIndexOf("}", i), text.lastIndexOf("{", i - 1), text.lastIndexOf(";", i), -1) + 1;
      stack.push(text.slice(start, i).trim());
    } else if (text[i] === "}") stack.pop();
  }
  return stack;
}

await check("dark mode: the link rule 'a { color: inherit }' is inside @layer base, so a text class on a link wins (row 5)", () => {
  const re = /(^|\n)\s*a\s*\{\s*color:\s*inherit;?\s*\}/g;
  const hits = [...stripped.matchAll(re)];
  assert.equal(hits.length, 1, "one such rule");
  const where = enclosing(stripped, hits[0].index + hits[0][0].length - 2);
  assert.deepEqual(where.slice(0, 1), ["@layer base"], JSON.stringify(where));
  // No other rule outside a layer sets the color of every link.
  const loose = [...stripped.matchAll(/(^|\n)\s*(a|a:[a-z-]+)\s*\{[^}]*color\s*:/g)].filter((m) => enclosing(stripped, m.index + m[0].length - 1).length === 0);
  assert.equal(loose.length, 0, "no link color rule outside a layer");
});

await check("pop-up CSS: fixed at the top center, no click, hidden until the delay, reduced motion stops the circle", () => {
  const rule = /\.loading-popup\s*\{([^}]*)\}/.exec(stripped)?.[1] ?? "";
  for (const part of ["position: fixed", "top: 0.75rem", "left: 50%", "pointer-events: none", "opacity: 0", "translateX(-50%)", "animation: loading-popup-in"]) assert.ok(rule.includes(part), part);
  assert.ok(/@keyframes loading-spin/.test(stripped) && /@keyframes loading-popup-in/.test(stripped));
  const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(stripped)?.[1] ?? "";
  assert.ok(/\.loading-spinner\s*\{\s*animation:\s*none/.test(reduced), reduced);
  assert.ok(/body:has\(\[data-nav-loading\]\) \[data-route-loading\]\s*\{\s*visibility:\s*hidden/.test(stripped), "one box at a time");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(rule), "the pop-up uses theme variables only, no hex color");
});

/** The color variables of each theme from globals.css. `:root` is the light theme. */
function themeVars() {
  const out = {};
  for (const [name, sel] of [["light", ":root"], ["dark", '[data-theme="dark"]'], ["sepia", '[data-theme="sepia"]'], ["solarized-light", '[data-theme="solarized-light"]'], ["solarized-dark", '[data-theme="solarized-dark"]']]) {
    const start = stripped.indexOf(`\n${sel} {`);
    assert.ok(start >= 0, "theme block " + sel);
    const end = stripped.indexOf("\n}", start);
    const block = stripped.slice(start, end);
    out[name] = Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1], m[2]]));
  }
  return out;
}
const lum = (hex) => {
  let x = hex.replace("#", "");
  if (x.length === 3) x = [...x].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

await check("contrast: the pop-up text, the grayed link, the active tab and the link text have 4.5 to 1 or more in all 5 themes", () => {
  const themes = themeVars();
  const root = themes.light;
  for (const [name, own] of Object.entries(themes)) {
    const v = { ...root, ...own };
    const pairs = [
      ["pop-up text --foreground on --background", v["--foreground"], v["--background"]],
      ["grayed link --muted on --background", v["--muted"], v["--background"]],
      ["active tab --tab-on-ink on --tab-on", v["--tab-on-ink"], v["--tab-on"]],
      ["link --accent on --background", v["--accent"], v["--background"]],
    ];
    for (const [label, fg, bg] of pairs) {
      assert.ok(fg && bg, `${name}: ${label} missing`);
      assert.ok(ratio(fg, bg) >= 4.5, `${name}: ${label} is ${ratio(fg, bg).toFixed(2)} to 1`);
    }
  }
});

done();
