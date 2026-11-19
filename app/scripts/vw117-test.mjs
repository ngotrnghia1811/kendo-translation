// VW117 (round 105, card P52.1): server-free tests of the panel order rules and the components of Q-A 3:96.6 rows 1 to 7.
// Owner words (Q-A 3:95.2, 2026-11-19): "Also I should be able to drag each panel around to reorder them, and the should snap into place when I do so"
// Owner pick (Q-A 3:96.6): "Also page columns". Rule line (Q-A 3:95.7): a feature of one page view goes to every page view.
//   part 1  lib/panel-order.ts: the order rules (move, drop slot, stored order with a missing or extra id, column order for a read-only viewer, reset keys)
//   part 2  the components as HTML: PagePanels, ReaderPanels, the title bar and the buttons
//   part 3  the sources: pointer drag (no HTML5 drag), slide length and reduced motion, the arrow key rule, the three screens use the one shared code
// Run: node scripts/vw117-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed". Made-up data only. No network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/page/made-up-book/p001");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");

const O = await import("../lib/panel-order.ts");
const S = await import("../lib/panel-size.ts");
const M = await import("../lib/page-move.ts");

// ---------------------------------------------------------------- part 1: the order rules

await check("normalizeOrder: a full stored order stays, an unknown id and a repeat drop out, a missing id goes to the end in the old order", () => {
  assert.deepEqual(O.normalizeOrder(["qa", "text", "image"], O.PAGE_PANEL_IDS), ["qa", "text", "image"]);
  assert.deepEqual(O.normalizeOrder(["qa", "zzz", "qa", "image"], O.PAGE_PANEL_IDS), ["qa", "image", "text"], "extra id and repeat drop, text is missing and comes last");
  assert.deepEqual(O.normalizeOrder(["comments"], O.COLUMN_IDS), ["comments", "ja", "agent", "own", "versions"]);
  assert.deepEqual(O.normalizeOrder([], O.COLUMN_IDS), [...O.COLUMN_IDS]);
});

await check("normalizeOrder: a value that is not a list, or a list of other types, gives the old order", () => {
  for (const v of [null, undefined, "qa", 5, { 0: "qa" }, [1, 2, 3], [null, {}]]) assert.deepEqual(O.normalizeOrder(v, O.PAGE_PANEL_IDS), [...O.PAGE_PANEL_IDS], JSON.stringify(v));
});

await check("parseOrder and serializeOrder: a missing or broken text gives the old order, the old order is not stored, a new order round-trips", () => {
  assert.deepEqual(O.parseOrder(null, O.TRANSLATE_PANEL_IDS), ["index", "pages", "tl3"]);
  assert.deepEqual(O.parseOrder("", O.TRANSLATE_PANEL_IDS), ["index", "pages", "tl3"]);
  assert.deepEqual(O.parseOrder("{broken", O.TRANSLATE_PANEL_IDS), ["index", "pages", "tl3"]);
  assert.deepEqual(O.parseOrder('{"a":1}', O.TRANSLATE_PANEL_IDS), ["index", "pages", "tl3"]);
  assert.equal(O.serializeOrder(["index", "pages", "tl3"], O.TRANSLATE_PANEL_IDS), null, "the old order removes the key");
  const text = O.serializeOrder(["tl3", "pages", "index"], O.TRANSLATE_PANEL_IDS);
  assert.equal(text, '["tl3","pages","index"]');
  assert.deepEqual(O.parseOrder(text, O.TRANSLATE_PANEL_IDS), ["tl3", "pages", "index"]);
  assert.equal(O.serializeOrder(["tl3"], O.TRANSLATE_PANEL_IDS), '["tl3","index","pages"]', "a short list is completed before it is stored");
});

await check("moveItem: one step left, one step right, to the first place, to the last place", () => {
  const l = ["a", "b", "c", "d"];
  assert.deepEqual(O.moveItem(l, 2, 1), ["a", "c", "b", "d"]);
  assert.deepEqual(O.moveItem(l, 1, 2), ["a", "c", "b", "d"]);
  assert.deepEqual(O.moveItem(l, 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(O.moveItem(l, 0, 3), ["b", "c", "d", "a"]);
  assert.deepEqual(l, ["a", "b", "c", "d"], "the input list is not changed");
});

await check("moveItem: no move for the same place, a place outside the list, or a negative place", () => {
  const l = ["a", "b", "c"];
  for (const [f, t] of [[1, 1], [-1, 1], [1, -1], [3, 0], [0, 3], [5, 5]]) assert.deepEqual(O.moveItem(l, f, t), l, `${f} to ${t}`);
});

await check("moveVisible: the page image is off, so the 2 visible panels move and the image keeps its place in the full order", () => {
  const order = ["image", "text", "qa"];
  const visible = order.filter((id) => id !== "image");
  assert.deepEqual(O.moveVisible(order, visible, 0, 1), ["image", "qa", "text"]);
  const order2 = ["text", "image", "qa"];
  assert.deepEqual(O.moveVisible(order2, ["text", "qa"], 1, 0), ["qa", "image", "text"], "the hidden image stays in the middle slot");
});

await check("moveVisible: a read-only viewer sees 2 of the 5 columns, and a move of them keeps the hidden writer columns in their slots", () => {
  const order = ["ja", "own", "agent", "comments", "versions"];
  const shown = O.shownColumns(order, true);
  assert.deepEqual(shown, ["ja", "agent"]);
  assert.deepEqual(O.moveVisible(order, shown, 1, 0), ["agent", "own", "ja", "comments", "versions"]);
  assert.deepEqual(O.moveVisible(order, shown, 0, 0), order);
  assert.deepEqual(O.moveVisible(order, shown, 0, 2), order, "a place outside the visible list changes nothing");
});

await check("stepTarget: a step inside the row gives the new place, a step at an end gives null (the button is not drawn there)", () => {
  assert.equal(O.stepTarget(1, -1, 3), 0);
  assert.equal(O.stepTarget(1, 1, 3), 2);
  assert.equal(O.stepTarget(0, -1, 3), null);
  assert.equal(O.stepTarget(2, 1, 3), null);
  assert.equal(O.stepTarget(-1, 1, 3), null);
});

// A row of 3 panels, 100 px wide each, with 20 px between them: left edges 0, 120, 240.
const row = [0, 120, 240].map((left) => ({ left, top: 0, width: 100, height: 400 }));

await check("dropGap: the pointer in the left half of a panel points before it, in the right half after it, outside the row before the first or after the last", () => {
  assert.equal(O.dropGap(row, -50, 100), 0);
  assert.equal(O.dropGap(row, 10, 100), 0, "left half of panel 0");
  assert.equal(O.dropGap(row, 60, 100), 1, "right half of panel 0");
  assert.equal(O.dropGap(row, 150, 100), 1, "left half of panel 1");
  assert.equal(O.dropGap(row, 200, 100), 2, "right half of panel 1");
  assert.equal(O.dropGap(row, 260, 100), 2, "left half of panel 2");
  assert.equal(O.dropGap(row, 330, 100), 3, "right half of panel 2");
  assert.equal(O.dropGap(row, 900, 100), 3);
  assert.equal(O.dropGap([], 5, 5), 0);
});

await check("drop at each slot: every panel dropped in every gap lands between the right neighbors (3 panels, 3 starts, 4 gaps)", () => {
  const ids = ["a", "b", "c"];
  for (let from = 0; from < 3; from++) {
    for (let gap = 0; gap <= 3; gap++) {
      const moved = O.moveItem(ids, from, O.finalIndex(from, gap));
      const rest = ids.filter((_, i) => i !== from);
      // The gap counts places of the old list. The panel goes before the panel that stood at the gap (the dragged panel itself does not count).
      const before = gap < 3 ? ids[gap] : null;
      const expected = [...rest];
      const at = before === null || before === ids[from] ? (gap > from ? rest.length : from) : rest.indexOf(before);
      expected.splice(at, 0, ids[from]);
      assert.deepEqual(moved, expected, `from ${from}, gap ${gap}`);
    }
  }
});

await check("drop in the gap before or after the dragged panel itself changes nothing", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(O.moveItem(ids, 1, O.finalIndex(1, 1)), ids);
  assert.deepEqual(O.moveItem(ids, 1, O.finalIndex(1, 2)), ids);
  assert.equal(O.finalIndex(0, 3), 2);
  assert.equal(O.finalIndex(2, 0), 0);
});

await check("dropGap: a row that wraps onto a second line (the column header at a narrow width) counts the first line before the pointer on the second line", () => {
  const wrapped = [
    { left: 0, top: 0, width: 100, height: 20 },
    { left: 120, top: 0, width: 100, height: 20 },
    { left: 0, top: 30, width: 100, height: 20 },
    { left: 120, top: 30, width: 100, height: 20 },
  ];
  assert.equal(O.dropGap(wrapped, 10, 10), 0);
  assert.equal(O.dropGap(wrapped, 200, 10), 2, "right half of the last item of line 1");
  assert.equal(O.dropGap(wrapped, 10, 40), 2, "left half of the first item of line 2: both items of line 1 are before");
  assert.equal(O.dropGap(wrapped, 90, 40), 3);
  assert.equal(O.dropGap(wrapped, 400, 40), 4);
  assert.equal(O.dropGap(wrapped, 400, 10), 2, "the pointer on line 1 right of everything: only line 1 is before it");
});

await check("markerSpot: the marker stands at the left edge of the panel after the gap, in the middle of a space between two panels, and at the right edge of the last panel", () => {
  assert.deepEqual(O.markerSpot(row, 0), { x: 0, top: 0, height: 400 });
  assert.deepEqual(O.markerSpot(row, 1), { x: 110, top: 0, height: 400 });
  assert.deepEqual(O.markerSpot(row, 2), { x: 230, top: 0, height: 400 });
  assert.deepEqual(O.markerSpot(row, 3), { x: 340, top: 0, height: 400 });
  assert.equal(O.markerSpot([], 0), null);
  assert.deepEqual(O.markerSpot(row, 99), { x: 340, top: 0, height: 400 }, "a gap past the end is the end");
  assert.deepEqual(O.markerSpot(row, -3), { x: 0, top: 0, height: 400 });
});

await check("markerSpot: touching panels with no space put the marker at the left edge of the next panel", () => {
  const touching = [0, 100, 200].map((left) => ({ left, top: 5, width: 100, height: 50 }));
  assert.deepEqual(O.markerSpot(touching, 1), { x: 100, top: 5, height: 50 });
});

await check("markerSpot: at the start of a second line the marker stands at the left edge of that line", () => {
  const wrapped = [
    { left: 0, top: 0, width: 100, height: 20 },
    { left: 120, top: 0, width: 100, height: 20 },
    { left: 0, top: 30, width: 100, height: 20 },
  ];
  assert.deepEqual(O.markerSpot(wrapped, 2), { x: 0, top: 30, height: 20 });
});

await check("resetKeys: Reset layout of a screen takes its order keys and its VW115 size keys, and no key of another screen or of another feature", () => {
  const keys = [
    "vw115:size:page:image",
    "vw115:size:page:text",
    "vw115:size:page:qa",
    "vw117:order:page:panels",
    "vw115:size:read:row",
    "vw115:size:translate:index",
    "vw115:size:translate:tl3",
    "vw117:order:translate:panels",
    "vw117:order:translate:columns",
    "vw115:size:pagex:image",
    "vw117:order:pagex:panels",
    "theme",
    "other:vw115:size:page:image",
  ];
  assert.deepEqual(O.resetKeys("page", keys), ["vw115:size:page:image", "vw115:size:page:text", "vw115:size:page:qa", "vw117:order:page:panels"]);
  assert.deepEqual(O.resetKeys("translate", keys), ["vw115:size:translate:index", "vw115:size:translate:tl3", "vw117:order:translate:panels", "vw117:order:translate:columns"]);
  assert.deepEqual(O.resetKeys("nothing", keys), []);
  assert.equal(O.orderKey("page", "panels"), "vw117:order:page:panels");
  assert.equal(S.sizeKey("page", "image"), "vw115:size:page:image", "the size key style of VW115 is the style that the order key follows");
});

await check("edgeToward: the border handle of /page sits on the side that faces the text panel after every move", () => {
  assert.equal(O.edgeToward(["image", "text", "qa"], "image", "text"), "right");
  assert.equal(O.edgeToward(["image", "text", "qa"], "qa", "text"), "left");
  assert.equal(O.edgeToward(["image", "text", "qa"], "text", "text"), null);
  assert.equal(O.edgeToward(["qa", "text", "image"], "qa", "text"), "right");
  assert.equal(O.edgeToward(["qa", "text", "image"], "image", "text"), "left");
  assert.equal(O.edgeToward(["text", "image", "qa"], "image", "text"), "left");
  assert.equal(O.edgeToward(["image", "qa", "text"], "qa", "text"), "right");
  assert.equal(O.edgeToward(["tl3", "pages", "index"], "tl3", "pages"), "right", "/translate: the TL_3 panel at the left");
  assert.equal(O.edgeToward(["tl3", "pages", "index"], "index", "pages"), "left", "/translate: the book index at the right");
  assert.equal(O.edgeToward(["index", "pages"], "zzz", "pages"), null);
});

await check("pageGrid: the old order gives the same columns as pageColumns of VW115, a new order and the sizes follow the panels", () => {
  const sizes = { image: { w: 410 }, text: { w: 700 }, qa: { w: 222 } };
  assert.equal(O.pageGrid(["image", "text", "qa"], {}), S.pageColumns(true, {}));
  assert.equal(O.pageGrid(["text", "qa"], {}), S.pageColumns(false, {}));
  assert.equal(O.pageGrid(["image", "text", "qa"], sizes), S.pageColumns(true, sizes));
  assert.equal(O.pageGrid(["qa", "text", "image"], {}), "340px minmax(0,1fr) 300px");
  assert.equal(O.pageGrid(["text", "image", "qa"], sizes), "700px 410px 222px");
  assert.equal(O.pageGrid(["qa", "image", "text"], { qa: { w: 250 } }), "250px 300px minmax(0,1fr)");
});

await check("shownColumns: the old order shows the 5 columns to a writer and the 2 text columns to a read-only viewer, in the saved order", () => {
  assert.deepEqual(O.shownColumns([...O.COLUMN_IDS], false), ["ja", "agent", "own", "comments", "versions"]);
  assert.deepEqual(O.shownColumns([...O.COLUMN_IDS], true), ["ja", "agent"]);
  assert.deepEqual(O.shownColumns(["versions", "own", "agent", "comments", "ja"], false), ["versions", "own", "agent", "comments", "ja"]);
  assert.deepEqual(O.shownColumns(["versions", "own", "agent", "comments", "ja"], true), ["agent", "ja"]);
});

await check("rowGroups: the old order gives the old row: Japanese and Agent translation side by side, then Your translation with its Comments button", () => {
  assert.deepEqual(O.rowGroups([...O.COLUMN_IDS], false), [{ kind: "texts", ids: ["ja", "agent"] }, { kind: "own", withComments: true }]);
});

await check("rowGroups: a read-only viewer has the text block only, and a moved column order holds for the columns that the viewer sees", () => {
  assert.deepEqual(O.rowGroups([...O.COLUMN_IDS], true), [{ kind: "texts", ids: ["ja", "agent"] }]);
  assert.deepEqual(O.rowGroups(["agent", "own", "ja", "comments", "versions"], true), [{ kind: "texts", ids: ["agent", "ja"] }], "own stands between them for a writer, not for a reader");
  assert.deepEqual(O.rowGroups(["own", "ja", "comments", "agent", "versions"], true), [{ kind: "texts", ids: ["ja", "agent"] }]);
});

await check("rowGroups: Agent translation first puts it at the left, Your translation first puts the box above the texts", () => {
  assert.deepEqual(O.rowGroups(["agent", "ja", "own", "comments", "versions"], false), [{ kind: "texts", ids: ["agent", "ja"] }, { kind: "own", withComments: true }]);
  assert.deepEqual(O.rowGroups(["own", "comments", "ja", "agent", "versions"], false), [{ kind: "own", withComments: true }, { kind: "texts", ids: ["ja", "agent"] }]);
});

await check("rowGroups: a column between Japanese and Agent translation splits the pair, and Comments before Your translation or away from it is its own block", () => {
  assert.deepEqual(O.rowGroups(["ja", "own", "agent", "comments", "versions"], false), [
    { kind: "texts", ids: ["ja"] },
    { kind: "own", withComments: false },
    { kind: "texts", ids: ["agent"] },
    { kind: "comments" },
  ]);
  assert.deepEqual(O.rowGroups(["comments", "own", "ja", "agent", "versions"], false), [{ kind: "comments" }, { kind: "own", withComments: false }, { kind: "texts", ids: ["ja", "agent"] }]);
  assert.deepEqual(O.rowGroups(["ja", "agent", "comments", "own", "versions"], false), [{ kind: "texts", ids: ["ja", "agent"] }, { kind: "comments" }, { kind: "own", withComments: false }]);
});

await check("rowGroups: Version history is never a block of a row (it is one box for the whole page section), whatever its place", () => {
  for (const order of [["versions", "ja", "agent", "own", "comments"], ["ja", "versions", "agent", "own", "comments"], ["ja", "agent", "own", "comments", "versions"]]) {
    const groups = O.rowGroups(order, false);
    assert.ok(groups.every((g) => g.kind === "texts" || g.kind === "own" || g.kind === "comments"));
    assert.equal(JSON.stringify(groups).includes("versions"), false);
  }
  assert.deepEqual(O.rowGroups(["versions", "ja", "agent", "own", "comments"], false), O.rowGroups([...O.COLUMN_IDS], false), "Version history at the front does not change the row");
});

await check("reset: after a move the old order is back by one call of normalizeOrder on the removed key (the hook then holds the old order)", () => {
  const moved = O.moveItem([...O.COLUMN_IDS], 0, 4);
  assert.notDeepEqual(moved, [...O.COLUMN_IDS]);
  assert.equal(O.serializeOrder([...O.COLUMN_IDS], O.COLUMN_IDS), null);
  assert.deepEqual(O.parseOrder(null, O.COLUMN_IDS), [...O.COLUMN_IDS]);
});

// ---------------------------------------------------------------- part 2: the components as HTML

const { default: PagePanels } = await import("../components/PagePanels.tsx");
const { default: ReaderPanels } = await import("../components/ReaderPanels.tsx");
const { MoveButtons, PanelTitleBar } = await import("../components/PanelDragBar.tsx");
const { default: ResetLayoutButton } = await import("../components/ResetLayoutButton.tsx");
const CO = await import("../components/ColumnOrder.tsx");

const bar = (index, count, id = "text") => ({ id, index, count, dragProps: { "data-reorder-bar": id }, moveBy() {} });
const tags = (html, re) => html.match(re) ?? [];

await check("PagePanels: each of the 3 panels has a title bar with its name, and the first panel has no ◀ and the last panel has no ▶ (rows 1 and 5)", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: h("img", { src: "x.png", alt: "scan" }), text: h("p", null, "text"), side: h("p", null, "qa") }));
  assert.equal(tags(html, /data-panel-title="/g).length, 3);
  for (const id of ["image", "text", "qa"]) assert.ok(html.includes(`data-panel-title="${id}"`), id);
  assert.equal(tags(html, /data-reorder-item="/g).length, 3);
  assert.ok(html.includes("Page image") && html.includes(">Text<") && html.includes("QA panel"));
  assert.equal(tags(html, /data-panel-move="left"/g).length, 2, "the image panel has no ◀");
  assert.equal(tags(html, /data-panel-move="right"/g).length, 2, "the QA panel has no ▶");
  for (const label of ["Move the text panel left", "Move the text panel right", "Move the page image panel right", "Move the QA panel left"]) assert.ok(html.includes(`aria-label="${label}"`), label);
  assert.equal(html.includes('aria-label="Move the page image panel left"'), false);
  assert.equal(html.includes('aria-label="Move the QA panel right"'), false);
});

await check("PagePanels: the title bars show from lg on only, and the buttons ◀ ▶ are real buttons (rows 5 and 7)", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: h("img", { src: "x.png", alt: "scan" }), text: h("p", null, "text"), side: h("p", null, "qa") }));
  for (const t of tags(html, /<div class="[^"]*"[^>]*data-panel-title="[^"]*"[^>]*>/g)) assert.ok(/hidden lg:flex/.test(t) && /lg:cursor-grab/.test(t) && /lg:touch-none/.test(t), t);
  for (const t of tags(html, /<button[^>]*data-panel-move="[^"]*"[^>]*>/g)) assert.ok(/type="button"/.test(t) && /max-lg:hidden/.test(t), t);
});

await check("PagePanels: one Reset layout button, the old grid string and the old handles are as VW115 left them", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: h("img", { src: "x.png", alt: "scan" }), text: h("p", null, "text"), side: h("p", null, "qa") }));
  assert.equal(tags(html, /data-layout-reset-screen="page"/g).length, 1);
  assert.ok(html.includes(">Reset layout<"));
  assert.ok(html.includes("--page-cols:300px minmax(0,1fr) 340px"));
  assert.equal(tags(html, /data-page-edge-/g).length, 2);
  assert.equal(tags(html, /data-page-corner-/g).length, 3);
  assert.equal(tags(html, /data-page-panel="/g).length, 3);
});

await check("PagePanels: without the page image there are 2 title bars and the text panel has a ◀ and no ▶ on the right side of the QA panel", () => {
  const html = renderToStaticMarkup(h(PagePanels, { image: null, text: h("p", null, "text"), side: h("p", null, "qa") }));
  assert.equal(tags(html, /data-panel-title="/g).length, 2);
  assert.equal(tags(html, /data-panel-move="left"/g).length, 1);
  assert.equal(tags(html, /data-panel-move="right"/g).length, 1);
  assert.ok(html.includes("--page-cols:minmax(0,1fr) 340px"));
});

await check("MoveButtons: the labels follow the name, nothing is drawn for one panel or for no bar, and the attribute name can change (the columns use data-column-move)", () => {
  const two = renderToStaticMarkup(h(MoveButtons, { bar: bar(1, 3, "tl3"), name: "TL_3 information panel", from: "lg" }));
  assert.ok(two.includes('aria-label="Move the TL_3 information panel left"') && two.includes('aria-label="Move the TL_3 information panel right"'));
  assert.ok(two.includes("◀") && two.includes("▶"));
  assert.equal(renderToStaticMarkup(h(MoveButtons, { bar: bar(0, 1), name: "x", from: "lg" })), "");
  assert.equal(renderToStaticMarkup(h(MoveButtons, { bar: null, name: "x", from: "lg" })), "");
  const col = renderToStaticMarkup(h(MoveButtons, { bar: bar(0, 5, "ja"), name: "Japanese column", from: "lg", attr: "data-column-move" }));
  assert.ok(col.includes('data-column-move="right"') && !col.includes("data-column-move=\"left\"") && col.includes('aria-label="Move the Japanese column right"'));
  assert.equal(col.includes("data-panel-move"), false);
});

await check("PanelTitleBar: the title text and a hint that tells to drag, and for the last panel the old text 'Keep at least one panel' with no button", () => {
  const html = renderToStaticMarkup(h(PanelTitleBar, { id: "qa", bar: bar(1, 3, "qa"), title: "QA panel", name: "QA panel", from: "lg" }));
  assert.ok(html.includes("QA panel") && html.includes('title="Drag the title bar to move the panel"') && html.includes('data-reorder-bar="qa"'));
  const only = renderToStaticMarkup(h(PanelTitleBar, { id: "ja", bar: bar(0, 1, "ja"), title: "Original text", name: "Original text panel", from: "md" }));
  assert.ok(only.includes('title="Keep at least one panel"') && !only.includes("data-panel-move") && only.includes("hidden md:flex"));
});

await check("ReaderPanels: the 3 title bars keep the old buttons and labels, show the first panel with no ◀, and have no HTML5 drag (row 2)", () => {
  const panel = (key, title) => ({ key, ids: [key], title, body: h("p", null, title) });
  const html = renderToStaticMarkup(
    h(ReaderPanels, { panels: [panel("image", "Page image"), panel("ja", "Original text"), panel("agent", "Agent text")], widths: {}, focus: false, band: false, activeKey: null, startTab: "image", onTap() {}, onMove() {}, onHide() {}, onWidth() {} }),
  );
  assert.equal(tags(html, /data-panel-title="/g).length, 3);
  assert.equal(tags(html, /data-panel-hide/g).length, 3);
  assert.equal(tags(html, /data-panel-move="left"/g).length, 2);
  assert.equal(tags(html, /data-panel-move="right"/g).length, 2);
  for (const label of ["Move the Original text panel left", "Move the Original text panel right", "Hide the Page image panel", "Move the Agent text panel left"]) assert.ok(html.includes(`aria-label="${label}"`), label);
  assert.equal(/draggable|ondragstart/i.test(html), false);
  assert.equal(tags(html, /data-reorder-item="/g).length, 3);
  assert.ok(html.includes("data-reader-corner") && html.includes("data-reader-handle"), "the VW115 handles stay");
});

await check("ReaderPanels: one panel has no buttons and keeps the text 'Keep at least one panel'; Focus mode has no title bar", () => {
  const panel = (key, title) => ({ key, ids: [key], title, body: h("p", null, title) });
  const base = { widths: {}, band: false, activeKey: null, startTab: "ja", onTap() {}, onMove() {}, onHide() {}, onWidth() {} };
  const one = renderToStaticMarkup(h(ReaderPanels, { ...base, panels: [panel("ja", "Original text")], focus: false }));
  assert.ok(one.includes('title="Keep at least one panel"') && !one.includes("data-panel-move") && !one.includes("data-panel-hide"));
  const focus = renderToStaticMarkup(h(ReaderPanels, { ...base, panels: [panel("ja", "Original text"), panel("agent", "Agent text")], focus: true }));
  assert.equal(focus.includes("data-panel-title"), false);
});

await check("ResetLayoutButton: a button that names its screen and the words 'Reset layout'", () => {
  const html = renderToStaticMarkup(h(ResetLayoutButton, { screen: "translate" }));
  assert.ok(html.includes('type="button"') && html.includes('data-layout-reset-screen="translate"') && html.includes(">Reset layout<"));
});

await check("ColumnOrder: a page section drawn with no provider has the old column order", () => {
  assert.equal(typeof CO.ColumnOrderContext, "object");
  assert.deepEqual(CO.ColumnOrderContext._currentValue?.order ?? [...O.COLUMN_IDS], [...O.COLUMN_IDS]);
});

// ---------------------------------------------------------------- part 3: the sources

await check("PanelDragBar: a pointer drag (no HTML5 drag), a drag starts only on the title bar and not on a button, a link, a box or a handle", () => {
  const src = noComments(read("components/PanelDragBar.tsx"));
  assert.ok(/onPointerDown/.test(src) && /setPointerCapture/.test(src) && /onPointerMove/.test(src) && /onPointerUp/.test(src));
  assert.equal(/draggable|onDragStart|onDrop|dataTransfer/.test(src), false);
  const m = src.match(/const INTERACTIVE = "([^"]*)"/);
  assert.ok(m, "the list of controls");
  for (const sel of ["button", "a", "input", "select", "textarea", "[role=separator]"]) assert.ok(m[1].split(", ").includes(sel), sel);
  assert.ok(/DRAG_START_PX = 4/.test(src), "a click stays a click");
  assert.ok(/e\.key === "Escape"/.test(src), "Esc cancels a drag");
});

await check("PanelDragBar: the slide is 0.15 s and is skipped when the system asks for less motion", () => {
  const src = read("components/PanelDragBar.tsx");
  assert.ok(/SLIDE_MS = 150/.test(src));
  assert.ok(/prefers-reduced-motion: reduce/.test(src));
  assert.ok(/if \(!reducedMotion\(\)\)/.test(src));
  assert.ok(/data-reorder-sliding/.test(src));
  assert.ok(/\.focus\(\{ preventScroll: true \}\)/.test(src), "the focus goes back to a button of the moved panel");
});

await check("the 3 screens use the one shared code: useReorder in ReaderPanels, PagePanels and HtvBook, the same ◀ ▶ buttons, and no second copy of the drop rule", () => {
  for (const f of ["components/ReaderPanels.tsx", "components/PagePanels.tsx", "components/HtvBook.tsx"]) assert.ok(/useReorder\(/.test(noComments(read(f))), f);
  for (const f of ["components/HtvIndex.tsx", "components/HtvPanelFrame.tsx"]) assert.ok(/MoveButtons/.test(read(f)), f);
  for (const f of ["components/ReaderPanels.tsx", "components/PagePanels.tsx", "components/HtvBook.tsx", "components/HtvIndex.tsx", "components/HtvPanelFrame.tsx", "components/HtvPageSection.tsx"]) {
    assert.equal(/function dropGap|function finalIndex|function moveItem|function markerSpot/.test(read(f)), false, f);
  }
  assert.equal(/draggable|onDragStart|dataTransfer/.test(noComments(read("components/ReaderPanels.tsx"))), false);
});

await check("the arrow key rule: Left and Right do nothing on a ◀ ▶ button, and still work on Previous page, Next page and the stage tabs", () => {
  const onMove = { closest: (sel) => (sel.includes("[data-panel-move]") ? {} : null), isContentEditable: false };
  const onColumn = { closest: (sel) => (sel.includes("[data-column-move]") ? {} : null), isContentEditable: false };
  const plainButton = { closest: () => null, isContentEditable: false };
  assert.equal(M.ownsArrowKeys(onMove), true);
  assert.equal(M.ownsArrowKeys(onColumn), true);
  assert.equal(M.ownsArrowKeys(onMove, false), true, "also on the Monitor page view, where the tabs do not own the keys");
  assert.equal(M.ownsArrowKeys(plainButton), false);
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: onMove }), null);
  assert.equal(M.pageKeyDirection({ key: "ArrowLeft", target: onColumn }), null);
  assert.equal(M.pageKeyDirection({ key: "ArrowRight", target: plainButton }), "next");
  assert.equal(M.pageKeyDirection({ key: "ArrowLeft", target: plainButton }), "previous");
  // The selectors are in the real strings, and the buttons carry the attributes.
  const src = read("lib/page-move.ts");
  assert.equal((src.match(/\[data-panel-move\], \[data-column-move\]/g) ?? []).length, 2);
  assert.ok(/attr = "data-panel-move"/.test(read("components/PanelDragBar.tsx")));
});

await check("/translate: the book screen keeps the order of the panels and of the columns in this browser, in two keys, and the header and the sections read one order", () => {
  const book = noComments(read("components/HtvBook.tsx"));
  assert.ok(/usePanelOrder\("translate", "panels", TRANSLATE_PANEL_IDS\)/.test(book));
  assert.ok(/usePanelOrder\("translate", "columns", COLUMN_IDS\)/.test(book));
  assert.ok(/<ColumnOrderContext\.Provider value=\{columnValue\}>/.test(book));
  assert.ok(/useColumnOrder\(\)/.test(book), "the header bar reads the order");
  assert.ok(/useColumnOrder\(\)/.test(noComments(read("components/HtvPageSection.tsx"))), "the page sections read the order");
  assert.ok(/rowGroups\(order, readOnly\)/.test(read("components/HtvPageSection.tsx")));
  assert.ok(/shownColumns\(order, readOnly\)/.test(book));
  assert.ok(/screen="translate"/.test(book) && /ResetLayoutButton/.test(book));
});

await check("/translate: the writer flags of the header columns are the writer columns of lib/panel-order.ts (one rule for a read-only viewer)", () => {
  const src = read("components/HtvBook.tsx");
  const block = src.slice(src.indexOf("const HEADER_COLUMNS"), src.indexOf("];", src.indexOf("const HEADER_COLUMNS")));
  const ids = [...block.matchAll(/id: "(\w+)", label: "[^"]+", writer: (true|false)/g)];
  assert.deepEqual(ids.map((m) => m[1]), [...O.COLUMN_IDS], "the old order of the header is the old order of the rule");
  assert.deepEqual(ids.filter((m) => m[2] === "true").map((m) => m[1]), [...O.WRITER_COLUMNS]);
});

await check("the sizes and the order use the same style of key, and usePanelOrder and useStoredSize both listen for the reset event of their screen", () => {
  const order = read("components/usePanelOrder.ts");
  const size = read("components/PanelResize.tsx");
  assert.ok(/RESET_EVENT/.test(order) && /RESET_EVENT/.test(size));
  assert.ok(/detail\?\.screen === screen/.test(order) && /detail\?\.screen !== screen/.test(size));
  assert.ok(/resetKeys\(screen, keys\)/.test(order));
  assert.equal(O.RESET_EVENT, "vw117:layout-reset");
  assert.ok(/localStorage/.test(order));
});

await check("/read: the order stays in the account and the button Reset layout of the component list is not changed (the keys that it clears are the old keys)", () => {
  const book = read("components/ReaderBook.tsx");
  assert.ok(/for \(const k of LAYOUT_KEYS\) delete rest\[k\];/.test(book));
  assert.ok(/clear: LAYOUT_KEYS/.test(book));
  assert.ok(read("lib/htv-settings.ts").includes('"components", "shown", "widths", "pair", "terms", "text", "en", "image"'));
  const list = read("components/ReaderComponentList.tsx");
  assert.ok(/data-layout-reset/.test(list) && /Reset layout/.test(list));
  assert.equal(/vw117/.test(book), false, "no new key in the account");
});

done();
