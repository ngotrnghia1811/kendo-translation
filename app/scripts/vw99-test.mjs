// Unit VW99 (round 91): server-free tests of the tabs (Q-A 3:27.3, D1 and D2 of Q-A 3:28.3), the colors by meaning (Q-A 3:27.4, D3)
// and the Runs table width fix (Q-A 3:28.2). Made-up data only: no real article ID, no e-mail address.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw99-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
// A navigation stub with an address that the test sets (globalThis.__vw99), registered after the kit, so that it wins.
const nav = `const a = () => globalThis.__vw99 ?? { path: "/runs/x", query: "" };
export const useRouter = () => ({ push() {} });
export const useSearchParams = () => new URLSearchParams(a().query);
export const usePathname = () => a().path;
export const notFound = () => { throw new Error("notFound"); };
export const redirect = (u) => { throw new Error("redirect " + u); };`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/navigation") return { url: `data:text/javascript,${encodeURIComponent(nav)}`, shortCircuit: true };
    return next(specifier, context);
  },
});
const at = (p, query = "") => (globalThis.__vw99 = { path: p, query });

const require = createRequire(path.join(app, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const T = await import("../lib/tabs.ts");
const keys = (tabs) => tabs.map((t) => t.key).join(",");
const PHASE2 = { phase2List: true, bookRunBook: null, listKind: "book-run" };
const BOOK_RUN = { phase2List: false, bookRunBook: "made-up-book", listKind: "book-run" };
const CHAIN = { phase2List: false, bookRunBook: null, listKind: "chain" };
const PILOT = { phase2List: false, bookRunBook: null, listKind: "list" };

// ---------------------------------------------------------------- part 1: tab rules

await check("run view tabs per list kind: phase 2 and book run have 4 tabs, a chain list has Pages and Chain state, a pilot list has Pages only", () => {
  assert.equal(keys(T.runTabs(PHASE2)), "pages,steps,updates,training");
  assert.equal(keys(T.runTabs(BOOK_RUN)), "pages,steps,updates,training");
  assert.equal(keys(T.runTabs(CHAIN)), "pages,chain");
  assert.equal(keys(T.runTabs(PILOT)), "pages");
  assert.deepEqual(
    T.runTabs(PHASE2).map((t) => t.label),
    ["Pages", "Steps", "Prompt updates", "Training monitor"],
  );
  assert.equal(T.runTabs(CHAIN)[1].label, "Chain state per book");
});

await check("D1: the first tab of each screen", () => {
  assert.equal(T.runDefaultTab(PHASE2), "steps");
  assert.equal(T.runDefaultTab(BOOK_RUN), "steps");
  assert.equal(T.runDefaultTab(CHAIN), "pages");
  assert.equal(T.runDefaultTab(PILOT), "pages");
  assert.equal(T.dashboardDefaultTab("running"), "phase2");
  assert.equal(T.dashboardDefaultTab("running-pause"), "phase2");
  for (const k of ["stopped", "failure", "completed", "not-started", "unexpected", "unreadable", null, undefined]) assert.equal(T.dashboardDefaultTab(k), "books", String(k));
  assert.equal(T.DETAIL_DEFAULT_TAB, "pages");
  assert.equal(keys(T.DASHBOARD_TABS), "phase2,books");
  assert.equal(keys(T.DETAIL_TABS), "pages,steps,training");
  assert.deepEqual(T.DASHBOARD_TABS.map((t) => t.label), ["Phase 2 run", "Books"]);
});

await check("address parse: ?tab= wins, ?box= and #training-monitor open Training monitor, an unknown or missing tab gives the default", () => {
  const tabs = T.runTabs(PHASE2);
  assert.equal(T.pickTab(tabs, "steps", {}), "steps");
  assert.equal(T.pickTab(tabs, "steps", { tab: "updates" }), "updates");
  assert.equal(T.pickTab(tabs, "steps", { tab: "nonsense" }), "steps");
  assert.equal(T.pickTab(tabs, "steps", { box: "TL_2" }), "training");
  assert.equal(T.pickTab(tabs, "steps", { hash: "#training-monitor" }), "training");
  assert.equal(T.pickTab(tabs, "steps", { tab: "pages", box: "TL_2" }), "pages");
  assert.equal(T.pickTab(tabs, "steps", { tab: "nonsense", box: "TL_2" }), "training");
  // A tab that the list does not have falls back: a chain list has no step tree, so ?box= and ?tab=steps give Pages.
  assert.equal(T.pickTab(T.runTabs(CHAIN), "pages", { tab: "steps" }), "pages");
  assert.equal(T.pickTab(T.runTabs(CHAIN), "pages", { box: "TL_2" }), "pages");
  assert.equal(T.pickTab(T.DETAIL_TABS, "pages", { box: "QA_3" }), "training");
  assert.equal(T.pickTab(T.DASHBOARD_TABS, "books", { box: "QA_3" }), "books");
  assert.equal(T.pickTab(T.DASHBOARD_TABS, "phase2", { tab: "books" }), "books");
});

await check("address build: ?tab= is set or replaced, ?box= stays, the path stays", () => {
  assert.equal(T.tabHref("/runs/20990101T000000Z", "", "steps"), "/runs/20990101T000000Z?tab=steps");
  assert.equal(T.tabHref("/runs/20990101T000000Z", "?box=TL_2", "training"), "/runs/20990101T000000Z?box=TL_2&tab=training");
  assert.equal(T.tabHref("/runs/20990101T000000Z", "box=TL_2&tab=training", "pages"), "/runs/20990101T000000Z?box=TL_2&tab=pages");
  assert.equal(T.tabHref("/", "", "books"), "/?tab=books");
});

await check("keyboard: arrow keys wrap around, Home and End go to the ends, other keys do nothing", () => {
  assert.equal(T.moveIndex("ArrowRight", 0, 4), 1);
  assert.equal(T.moveIndex("ArrowRight", 3, 4), 0);
  assert.equal(T.moveIndex("ArrowLeft", 0, 4), 3);
  assert.equal(T.moveIndex("Home", 2, 4), 0);
  assert.equal(T.moveIndex("End", 0, 4), 3);
  assert.equal(T.moveIndex("a", 0, 4), null);
});

// ---------------------------------------------------------------- part 2: the tab component

const Tabs = (await import("../components/Tabs.tsx")).Tabs;
const seen = [];
const panel = (open) => {
  seen.push(open);
  return React.createElement("p", { "data-made-up": open }, `content of ${open}`);
};

await check("tab row: roles, aria-selected, one tab in the tab order, links with the address of each tab, only the open panel in the page", () => {
  at("/runs/20990101T000000Z", "box=TL_2");
  seen.length = 0;
  const html = h(Tabs, { label: "Parts of the run view", idBase: "run", tabs: T.runTabs(PHASE2), fallback: "steps", children: panel });
  assert.match(html, /role="tablist" aria-label="Parts of the run view"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
  assert.match(html, /id="run-tab-training" href="\/runs\/20990101T000000Z\?box=TL_2&amp;tab=training" role="tab" aria-selected="true" aria-controls="run-panel" tabindex="0"/);
  assert.match(html, /id="run-tab-steps" href="\/runs\/20990101T000000Z\?box=TL_2&amp;tab=steps" role="tab" aria-selected="false" aria-controls="run-panel" tabindex="-1"/);
  assert.match(html, /role="tabpanel" id="run-panel" aria-labelledby="run-tab-training" tabindex="0" data-tab-panel="training"/);
  assert.deepEqual(seen, ["training"], "only the open tab renders its content, so a closed tab runs no poll");
  assert.ok(html.includes("content of training") && !html.includes("content of steps"));
  // The text color sits on a span inside the link, because the global rule "a { color: inherit }" wins over a color class on the link.
  assert.match(html, /aria-selected="true"[^>]*class="[^"]*bg-tab-on[^"]*"><span class="text-tab-on-ink">Training monitor<\/span>/);
  assert.match(html, /aria-selected="false"[^>]*class="[^"]*border-line bg-white[^"]*"><span class="text-foreground">Steps<\/span>/);
  assert.equal(htmlText(html).includes("Prompt updates"), true);
});

await check("tab row: no address gives the D1 default, an unknown tab too; one tab only gives no tab row", () => {
  at("/runs/20990101T000000Z", "");
  assert.match(h(Tabs, { label: "x", idBase: "run", tabs: T.runTabs(PHASE2), fallback: "steps", children: panel }), /data-tab-panel="steps"/);
  at("/runs/20990101T000000Z", "tab=nonsense");
  assert.match(h(Tabs, { label: "x", idBase: "run", tabs: T.runTabs(PHASE2), fallback: "steps", children: panel }), /data-tab-panel="steps"/);
  at("/runs/20990101T000000Z", "tab=chain");
  const one = h(Tabs, { label: "x", idBase: "run", tabs: T.runTabs(PILOT), fallback: "pages", children: panel });
  assert.ok(!one.includes('role="tablist"'));
  assert.match(one, /data-tab-panel="pages"/);
});

// ---------------------------------------------------------------- part 3: the screens with tabs

const RunView = (await import("../components/RunView.tsx")).default;
const STAMP = "20990101T000000Z";
const row = (n, state, extra = {}) => ({
  pageId: `made-up-book/p00${n}`,
  kind: "body",
  state,
  runFolder: state === "waiting" ? "" : `${STAMP}-r${n}`,
  callsDone: 0,
  callsTotal: 4,
  callsFailed: 0,
  running: state === "running" ? ["TL_2"] : [],
  usd: 0,
  tokens: null,
  minutes: null,
  qa3Verdict: null,
  qa3Score: null,
  href: `/page/made-up-book/p00${n}`,
  skippedReason: null,
  forwardFailures: null,
  criticFailures: null,
  bookMemory: null,
  ...extra,
});
const run = (over) => ({
  stamp: STAMP,
  state: "running",
  pagesDone: 2,
  pagesTotal: 5,
  callsDone: 8,
  callsTotal: 20,
  callsFailed: 0,
  callsFlagged: 0,
  costModelsUsd: 0,
  costListedUsd: 0,
  tokens: null,
  startedEpoch: 4070908800,
  updatedEpoch: 4070909800,
  pausedSinceEpoch: null,
  listKind: "book-run",
  criticMode: null,
  bookJobs: null,
  noCritic: null,
  noVoyage: null,
  chains: null,
  elapsedBeforeSeconds: 0,
  pauseSecondsTotal: 0,
  pausedSinceUtc: null,
  pauseFileExists: false,
  pages: [row(1, "done"), row(2, "done"), row(3, "running"), row(4, "waiting"), row(5, "failed")],
  serverTimeEpoch: 4070909900,
  ...over,
});

await check("run view of a phase 2 list: title and progress bar above 4 tabs, Steps open, the training monitor and the page table not in the page", () => {
  at(`/runs/${STAMP}`, "");
  const html = h(RunView, { initial: run({ phase2List: true }) });
  const t = htmlText(html);
  assert.ok(html.indexOf("data-run-heading") < html.indexOf('role="tablist"'));
  assert.ok(html.indexOf("data-run-progress") < html.indexOf('role="tablist"'));
  assert.ok(t.includes("2 translated, 1 translating now, 1 not started yet, 1 failed or interrupted, of 5 pages"));
  assert.match(html, /role="progressbar" aria-label="Pages of this list" aria-valuemin="0" aria-valuemax="5" aria-valuenow="2"/);
  assert.match(html, /data-bar-part="accepted" class="h-full bg-bar-ok" style="width:40%"/);
  assert.match(html, /data-bar-part="running" class="h-full bg-bar-run" style="width:20%"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
  assert.match(html, /data-tab-panel="steps"/);
  assert.ok(t.includes("Steps of this phase 2 run"));
  assert.ok(t.includes("Loading the steps of the phase 2 run"));
  assert.ok(!html.includes('id="training-monitor"'));
  assert.ok(!html.includes("data-run-page="), "the page table sits in the closed tab Pages");
});

await check("run view: ?box=TL_2 opens Training monitor; ?tab=updates opens Prompt updates without the tree; a chain list opens Pages", () => {
  at(`/runs/${STAMP}`, "box=TL_2");
  const tm = h(RunView, { initial: run({ phase2List: true }) });
  assert.match(tm, /data-tab-panel="training"/);
  assert.ok(tm.includes('id="training-monitor"') && tm.includes('data-box-button="TL_2" aria-pressed="true"'));
  at(`/runs/${STAMP}`, "tab=updates");
  const up = h(RunView, { initial: run({ phase2List: true }) });
  assert.match(up, /data-tab-panel="updates"/);
  assert.ok(up.includes("data-run-updates"));
  at(`/runs/${STAMP}`, "");
  const chain = h(RunView, { initial: run({ listKind: "chain", chains: [] }) });
  assert.equal((chain.match(/role="tab"/g) ?? []).length, 2);
  assert.match(chain, /data-tab-panel="pages"/);
  assert.ok(chain.includes("data-run-page="));
  at(`/runs/${STAMP}`, "tab=chain");
  assert.ok(htmlText(h(RunView, { initial: run({ listKind: "chain", chains: [] }) })).includes("Chain state per book"));
});

await check("run view of a book-run list: the same 4 tabs, Steps open with the book heading", () => {
  at(`/runs/${STAMP}`, "");
  const html = h(RunView, { initial: run({ bookRunBook: "made-up-book", bookRunTitle: "Made-up Book" }) });
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
  assert.ok(htmlText(html).includes("Steps of this book run: Made-up Book"));
  assert.ok(html.includes('data-run-steps-book="made-up-book"'));
});

await check("sources: the Monitor dashboard and the Details view use the tabs with their D1 defaults; the phase 2 row line stays", () => {
  const md = read("components/MonitorDashboard.tsx");
  assert.ok(md.includes("tabs={DASHBOARD_TABS} fallback={dashboardDefaultTab(initial.phase2?.key)}"));
  assert.ok(md.includes("<Phase2Row view={data.phase2} now={now} articles={data.phase2Articles} />"));
  assert.ok(md.includes('useLive<MonitorData>("/api/monitor/books", initial, () => true)'));
  const bd = read("components/BookDetailView.tsx");
  assert.ok(bd.includes("tabs={DETAIL_TABS} fallback={DETAIL_DEFAULT_TAB}"));
  assert.ok(bd.indexOf('part="last-error"') < bd.indexOf("<Tabs "), "the last error stays above the tabs");
  assert.ok(bd.indexOf('{open === "steps" ?') < bd.indexOf('<Section part="book-watch"'));
  assert.ok(bd.includes('<TrainingMonitor stamp={data.watch.monitorStamp} book={slug} />'));
  assert.ok(bd.includes("<StepView initial={null} list={null} book={slug} />"));
});

// ---------------------------------------------------------------- part 4: colors (D3)

const css = read("app/globals.css");
const VW99_VARS = [
  "chip-ts", "chip-ts-ink", "chip-tl", "chip-tl-ink", "chip-ed", "chip-ed-ink", "chip-qa", "chip-qa-ink",
  "state-ok", "state-ok-ink", "state-run", "state-run-ink", "state-wait", "state-wait-ink", "state-fail", "state-fail-ink", "state-stop", "state-stop-ink",
  "bar-ok", "bar-run", "bar-wait", "band", "band-ink", "tab-on", "tab-on-ink", "section", "section-ink", "title", "button2-ink",
];
const block = (selector) => {
  const i = css.indexOf(`${selector} {`);
  assert.ok(i >= 0, `no block ${selector}`);
  return css.slice(i, css.indexOf("\n}", i));
};

await check("each new color variable has a value in all 5 themes and a Tailwind color name", () => {
  for (const sel of [":root", '[data-theme="dark"]', '[data-theme="sepia"]', '[data-theme="solarized-light"]', '[data-theme="solarized-dark"]']) {
    const b = block(sel);
    for (const v of VW99_VARS) assert.match(b, new RegExp(`--${v}: #[0-9a-f]{6};`), `${sel} --${v}`);
  }
  for (const v of VW99_VARS) assert.ok(css.includes(`--color-${v}: var(--${v});`), `@theme --color-${v}`);
});

await check("every new color class in the components has a variable", () => {
  const files = ["components/Tabs.tsx", "components/ProgressBar.tsx", "components/BoxCode.tsx", "components/Pills.tsx", "components/StateLabel.tsx", "components/Phase2Row.tsx", "components/Phase2Articles.tsx", "components/Nav.tsx", "components/BookRow.tsx", "components/TrainingMonitor.tsx", "components/StepTree.tsx"];
  const names = new Set();
  for (const f of files) for (const m of read(f).matchAll(/\b(?:bg|text|border)-((?:chip|state|bar|band|tab|section|title|button2)[a-z0-9-]*)/g)) names.add(m[1]);
  assert.ok(names.size >= 20, `found ${names.size}`);
  for (const n of names) assert.ok(VW99_VARS.includes(n), `class color ${n} has no variable`);
});

await check("box code chips: TS grey, TL blue, ED green, QA purple; the code text and the hover name stay", async () => {
  const { BoxCode } = await import("../components/BoxCode.tsx");
  const { GroupCode } = await import("../components/Named.tsx");
  for (const [code, kind] of [["TS_0", "ts"], ["TL_2", "tl"], ["ED_1", "ed"], ["QA_3", "qa"], ["box-critic.ED_2", "ed"]]) {
    const html = h(BoxCode, { code });
    assert.ok(html.includes(`bg-chip-${kind} text-chip-${kind}-ink`), code);
    assert.match(html, new RegExp(`<span data-box-code="${code.replace(".", "\\.")}" title="[^"]+"[^>]*>${code.replace(".", "\\.")}<span class="sr-only">`), code);
  }
  assert.ok(h(GroupCode, { code: "TL" }).includes("bg-chip-tl text-chip-tl-ink"));
});

await check("state pills: color by meaning, the word stays on the pill", async () => {
  const { StatePill, VerdictPill } = await import("../components/Pills.tsx");
  const cases = [
    ["done", "Translated", "state-ok"],
    ["running", "Translating now", "state-run"],
    ["waiting", "Not started yet", "state-wait"],
    ["failed", "Failed", "state-fail"],
    ["stopped", "Stopped", "state-stop"],
    ["interrupted", "Interrupted", "state-stop"],
  ];
  for (const [state, label, cls] of cases) {
    const html = h(StatePill, { state, label });
    assert.ok(html.includes(`bg-${cls} text-${cls}-ink`), state);
    assert.equal(htmlText(html).trim(), label);
  }
  assert.ok(h(VerdictPill, { verdict: "FAIL", score: 4.5 }).includes("bg-state-fail text-state-fail-ink"));
  assert.ok(htmlText(h(VerdictPill, { verdict: "FAIL", score: 4.5 })).includes("FAIL"));
  assert.ok(h(VerdictPill, { verdict: "PASS", score: 8 }).includes("bg-state-ok text-state-ok-ink"));
  const StateLabel = (await import("../components/StateLabel.tsx")).default;
  const lab = h(StateLabel, { row: { key: "stopped", label: "Stopped", symbol: "■" } });
  assert.ok(lab.includes("bg-state-stop text-state-stop-ink") && htmlText(lab).includes("Stopped"));
});

await check("bands: the top bar is a dark red band, section headers sit on a tinted band, the second button rule spares tabs and toggles", () => {
  assert.ok(read("components/Nav.tsx").includes("bg-band text-band-ink"));
  assert.match(css, /\.section-band \{\s*background: var\(--section\);\s*color: var\(--section-ink\);/);
  assert.ok(css.includes('button.border-line:not(.bg-accent):not([aria-pressed]):not([role="tab"]) {'));
  for (const f of ["components/RunView.tsx", "components/BookRunSections.tsx", "components/TrainingMonitor.tsx", "components/BookDetailView.tsx", "components/StepTree.tsx", "components/ReaderBook.tsx"]) assert.ok(read(f).includes("section-band"), f);
});

await check("contrast script: it knows every new variable and checks the new pairs at 7 to 1 in all 5 themes", () => {
  const s = read("scripts/contrast-dark.mjs");
  for (const v of VW99_VARS) assert.ok(s.includes(`"${v}"`), v);
  assert.ok((s.match(/"VW99: /g) ?? []).length >= 17);
});

// ---------------------------------------------------------------- part 5: Runs table width (Q-A 3:28.2)

await check("Runs table: the scroll box holds the hidden label (class relative), and so do the tables of the Details view", () => {
  const rt = read("components/BookRunsTable.tsx");
  assert.ok(rt.includes('<div className="relative mt-2 overflow-x-auto rounded border border-line bg-white">'));
  assert.ok(rt.includes('<span className="sr-only">Open or close to readers</span>'));
  const bd = read("components/BookDetailView.tsx");
  assert.equal((bd.match(/className="overflow-x-auto/g) ?? []).length, 0, "every scroll box of the Details view is relative");
});

await check("no money and no e-mail address in the new parts", async () => {
  const all = ["lib/tabs.ts", "components/Tabs.tsx", "components/ProgressBar.tsx", "components/RunPagesTable.tsx"].map(read).join("\n");
  assert.ok(!/USD|\$\{?cost|dollar/i.test(all.replace(/usd: number/g, "")), "money");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(all), "e-mail");
});

done();
