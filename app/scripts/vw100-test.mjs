// Unit VW100 (Q-A 3:29.2 "Compact top bar in VW100"): server-free tests of the markup of the top bar (components/Nav.tsx, components/NavMenuButton.tsx).
// Which form shows at which width is CSS (below 768 px: site name and one button "Menu"; from 768 px up: the bar of commit 3f64bb1). The browser check
// measures it. This test checks the markup: the button attributes, the ids, the one list of links per path and monitor flag, the reader pages, the desktop classes.
// Made-up data only: no real article ID, no e-mail address.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw100-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
// A navigation stub with an address that the test sets (globalThis.__vw100), registered after the kit, so that it wins.
const nav = `const a = () => globalThis.__vw100 ?? "/";
export const useRouter = () => ({ push() {} });
export const useSearchParams = () => new URLSearchParams();
export const usePathname = () => a();
export const notFound = () => { throw new Error("notFound"); };
export const redirect = (u) => { throw new Error("redirect " + u); };`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/navigation") return { url: `data:text/javascript,${encodeURIComponent(nav)}`, shortCircuit: true };
    return next(specifier, context);
  },
});
const at = (p) => (globalThis.__vw100 = p);

const require = createRequire(path.join(app, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const Nav = (await import("../components/Nav.tsx")).default;
const { default: NavMenuButton, NAV_MENU_ID, navMenuClass } = await import("../components/NavMenuButton.tsx");

const ALL = [
  ["/", "Monitor dashboard"],
  ["/runs", "Lists"],
  ["/books", "Books"],
  ["/settings/run", "Run settings"],
  ["/json", "JSON viewer"],
  ["/translate", "Human translation"],
];
const render = (p, monitor = true, theme = "light") => (at(p), h(Nav, { monitor, theme }));
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const links = (html) => [...html.matchAll(/<a\s([^>]*)>(.*?)<\/a>/g)].map((m) => ({ ...attrs(m[1]), text: htmlText(m[2]).trim() }));
const buttonTag = (html) => html.match(/<button[^>]*data-menu-button[^>]*>/)?.[0] ?? "";
const idx = (html, s) => html.indexOf(s);

// ---------------------------------------------------------------- part 1: the button

await check("the Menu button: a real button with the word Menu, aria-expanded false, aria-controls the menu id, hidden from 768 px up", () => {
  const html = render("/");
  const b = buttonTag(html);
  assert.ok(b.startsWith("<button"), "a <button>");
  const a = attrs(b);
  assert.equal(a.type, "button");
  assert.equal(a["aria-expanded"], "false");
  assert.equal(a["aria-controls"], NAV_MENU_ID);
  assert.equal(NAV_MENU_ID, "top-menu");
  assert.ok(a.class.split(" ").includes("md:hidden"), "md:hidden");
  assert.ok(a.class.split(" ").includes("min-h-11") && a.class.split(" ").includes("min-w-11"), "hit area 44 px (Tailwind spacing 11)");
  assert.match(a.class, /focus-visible:outline-2/);
  const text = htmlText(html.slice(html.indexOf(b), html.indexOf("</button>", html.indexOf(b)))).trim();
  assert.equal(text, "Menu", "the word stays on the button");
  assert.ok(html.slice(html.indexOf(b)).includes('<svg aria-hidden="true"'), "the icon is hidden from the screen reader");
});

await check("the Menu button, open: aria-expanded true and a cross icon; closed: three lines", () => {
  const closed = h(NavMenuButton, { open: false, onToggle() {} });
  const open = h(NavMenuButton, { open: true, onToggle() {} });
  assert.equal(attrs(closed.match(/<button[^>]*>/)[0])["aria-expanded"], "false");
  assert.equal(attrs(open.match(/<button[^>]*>/)[0])["aria-expanded"], "true");
  assert.ok(closed.includes('d="M3 5H15M3 9H15M3 13H15"'));
  assert.ok(open.includes('d="M4 4L14 14M14 4L4 14"'));
  assert.equal(htmlText(open).trim(), "Menu");
  assert.match(open, /aria-expanded:bg-band-ink aria-expanded:text-band/);
});

await check("the menu box: the id of aria-controls exists once, holds the nav and the theme switch, and comes after the button", () => {
  const html = render("/");
  assert.equal((html.match(/id="top-menu"/g) ?? []).length, 1);
  const m = idx(html, 'id="top-menu"');
  const b = idx(html, "data-menu-button");
  assert.ok(b > 0 && m > b, "the menu follows the button, so Tab goes from the button into the links");
  assert.ok(idx(html, "<nav") > m, "the nav is inside the menu box");
  assert.ok(idx(html, "data-theme-switch") > idx(html, "</nav>"), "the theme switch follows the links inside the menu box");
  assert.ok(html.indexOf("</header>") > idx(html, "data-theme-switch"));
});

await check("closed and open classes of the menu box", () => {
  assert.equal(navMenuClass(false), "md:contents max-md:basis-full max-md:flex-col max-md:pb-2 max-md:hidden");
  assert.equal(navMenuClass(true), "md:contents max-md:basis-full max-md:flex-col max-md:pb-2 max-md:flex");
  const closed = render("/");
  assert.ok(closed.includes(`class="${navMenuClass(false)}"`), "the page starts closed");
  const menuTokens = attrs(closed.match(/<div[^>]*id="top-menu"[^>]*>/)[0]).class.split(" ");
  assert.ok(menuTokens.includes("max-md:hidden") && !menuTokens.includes("max-md:flex"), "no open class in the first render");
});

// ---------------------------------------------------------------- part 2: one list of links

await check("monitor on: the 6 links in one list, in order, one nav, one theme switch", () => {
  const html = render("/");
  const l = links(html);
  assert.deepEqual(l.map((x) => x.href), ALL.map((x) => x[0]));
  assert.deepEqual(l.map((x) => x.text), ALL.map((x) => x[1]));
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.equal((html.match(/data-theme-switch/g) ?? []).length, 1);
  assert.equal((html.match(/aria-label="Main tabs"/g) ?? []).length, 1);
  assert.equal((html.match(/<a /g) ?? []).length, 6, "no second list for the phone");
  assert.equal((html.match(/<header/g) ?? []).length, 1);
});

await check("the open tab per path: one link has aria-current, with bold text and the left bar class on the phone", () => {
  const cases = [
    ["/", "/"],
    ["/monitor/phase-2", "/"],
    ["/monitor/made-up-book", "/"],
    ["/runs", "/runs"],
    ["/runs/20000101T000000Z", "/runs"],
    ["/books", "/books"],
    ["/page/made-up-book/p001", "/books"],
    ["/settings/run", "/settings/run"],
    ["/json", "/json"],
    ["/json/made-up", "/json"],
    ["/translate", "/translate"],
    ["/translate/made-up-book", "/translate"],
  ];
  for (const [p, href] of cases) {
    const l = links(render(p));
    const on = l.filter((x) => x["aria-current"] === "page");
    assert.equal(on.length, 1, p);
    assert.equal(on[0].href, href, p);
    assert.ok(on[0].class.includes("font-semibold") && on[0].class.includes("border-band-ink"), p);
    for (const x of l) assert.ok(x.class.includes("max-md:border-l-4"), `${p} ${x.href} left bar on the phone`);
    for (const x of l.filter((y) => y !== on[0])) assert.ok(!x.class.includes("font-semibold") && x.class.includes("border-transparent"), `${p} ${x.href}`);
  }
});

await check("an unknown path marks no tab", () => {
  assert.equal(links(render("/made-up")).filter((x) => x["aria-current"]).length, 0);
});

await check("monitor off: only the Human translation link, the name stays", () => {
  const html = render("/translate", false);
  const l = links(html);
  assert.deepEqual(l.map((x) => x.href), ["/translate"]);
  assert.ok(buttonTag(html).includes("data-menu-button"));
  assert.equal(htmlText(render("/translate", false)).includes("Monitor dashboard"), false);
});

await check("site name per path (the same text as before VW100)", () => {
  const name = (p) => htmlText(render(p).match(/<header[\s\S]*?<\/div>/)[0]).trim();
  assert.match(name("/"), /^agent-translation-monitor/);
  assert.match(name("/runs"), /^agent-translation-monitor/);
  assert.match(name("/translate"), /^human-translation-view/);
  assert.match(name("/translate/made-up-book"), /^human-translation-view/);
  assert.match(name("/read"), /^Kendo books/);
  assert.match(name("/admin"), /^Kendo books/);
});

await check("reader pages: no tabs, the name Kendo books, the button Menu, the theme switch in the menu, the empty nav hidden on the phone", () => {
  for (const p of ["/read", "/read/made-up-book", "/admin", "/admin/readers", "/sign-in", "/sign-up"]) {
    for (const monitor of [true, false]) {
      const html = render(p, monitor);
      assert.equal(links(html).length, 0, `${p} links`);
      assert.ok(htmlText(html).includes("Kendo books"), p);
      assert.ok(buttonTag(html).includes("data-menu-button"), `${p} button`);
      assert.ok(idx(html, "data-theme-switch") > idx(html, 'id="top-menu"'), `${p} theme switch in the menu`);
      assert.match(html.match(/<nav[^>]*>/)[0], /max-md:hidden/, `${p} empty nav hidden on the phone`);
    }
  }
  assert.ok(!/max-md:hidden/.test(render("/").match(/<nav[^>]*>/)[0]), "a nav with links shows in the open menu");
});

await check("the theme switch: 5 themes in the menu, the pressed one follows the prop", () => {
  const html = render("/", true, "sepia");
  const sw = html.slice(idx(html, "data-theme-switch"));
  assert.equal((sw.match(/<button/g) ?? []).length, 5);
  assert.equal((sw.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(sw, /aria-pressed="true"[^>]*>Sepia</);
  for (const t of ["Light", "High-contrast dark", "Sepia", "Solarized light", "Solarized dark"]) assert.ok(sw.includes(`>${t}<`), t);
});

// ---------------------------------------------------------------- part 3: the desktop form stays (VW92 rule)

await check("desktop classes stay as at 3f64bb1: header, name, nav, links, and the wrappers that turn into display: contents from 768 px", () => {
  const html = render("/");
  const header = attrs(html.match(/<header[^>]*>/)[0]);
  assert.equal(header.class, "border-b border-line bg-band text-band-ink px-6 flex flex-wrap md:flex-nowrap items-end gap-x-8");
  assert.ok("data-top-band" in header);
  assert.ok(html.includes('<div class="py-3 font-semibold tracking-tight">agent-translation-monitor</div>'));
  const navTag = attrs(html.match(/<nav[^>]*>/)[0]);
  for (const c of ["flex", "flex-wrap", "md:flex-nowrap", "gap-1"]) assert.ok(navTag.class.split(" ").includes(c), `nav ${c}`);
  for (const x of links(html)) {
    assert.ok(x.class.startsWith("px-4 py-3 text-sm border-b-2 -mb-px "), x.href);
    assert.ok(/^px-4 py-3 text-sm border-b-2 -mb-px max-md:border-l-4 (border-band-ink font-semibold text-band-ink|border-transparent text-band-ink hover:border-band-ink)$/.test(x.class), x.href);
  }
  // The two new wrappers and the theme switch box have md:contents, so that they make no box from 768 px up.
  const wrappers = [...html.matchAll(/<div[^>]*class="([^"]*md:contents[^"]*)"/g)].map((m) => m[1]);
  assert.equal(wrappers.length, 3, "row of name and button, menu box, theme switch box");
  for (const w of wrappers) assert.ok(w.split(" ").includes("md:contents"), w);
  // Every phone-only class has the max-md: prefix, and the button has md:hidden, so no new class changes the desktop.
  const src = read("components/Nav.tsx") + read("components/NavMenuButton.tsx");
  assert.ok(!/(?<![:\w-])(basis-full|flex-col|pb-2|border-l-4)\b/.test(src.replace(/\/\/.*$/gm, "")), "a phone class without max-md:");
});

await check("one list: Nav.tsx has one TABS list and one map over it; the new component has no link", () => {
  const n = read("components/Nav.tsx");
  assert.equal((n.match(/const TABS = \[/g) ?? []).length, 1);
  assert.equal((n.match(/tabs\.map\(/g) ?? []).length, 1);
  assert.equal((n.match(/<Link/g) ?? []).length, 1);
  assert.ok(!/<Link|<a /.test(read("components/NavMenuButton.tsx")));
  // The tests of other units read these lines of Nav.tsx.
  assert.match(n, /href: "\/json", label: "JSON viewer", monitor: true/);
  assert.match(n, /href: "\/settings\/run", label: "Run settings", monitor: true/);
  assert.ok(n.includes("bg-band text-band-ink"));
});

await check("the menu closes: a link click, Escape, and a new path (the source holds each rule once)", () => {
  const n = read("components/Nav.tsx");
  assert.ok(n.includes("const open = openPath === path;"), "a new path closes the menu");
  assert.ok(n.includes("onClick={() => setOpenPath(null)}"), "a link click closes it");
  assert.ok(n.includes('e.key !== "Escape"') && n.includes("setOpenPath(null);"), "Escape closes it");
  assert.ok(n.includes("buttonRef.current?.focus()"), "focus returns to the button");
  assert.ok(n.includes("setOpenPath(open ? null : path)"), "a second tap closes it");
  assert.ok(n.includes('document.removeEventListener("keydown", onKey)'), "the listener is removed");
});

// ---------------------------------------------------------------- part 4: colors and words

await check("colors: only the pair band / band-ink (7 to 1 in all 5 themes, VW99), no new color variable, no hex value in the new parts", () => {
  const files = ["components/Nav.tsx", "components/NavMenuButton.tsx"];
  const allowed = new Set(["band", "band-ink", "line", "transparent"]);
  for (const f of files) {
    const s = read(f).replace(/\/\/.*$/gm, "");
    for (const m of s.matchAll(/(?:bg|text|border|outline)-([a-z][a-z0-9-]*)/g)) {
      // Sizes and widths are not colors.
      if (/^(sm|xs|base|lg|b|l|t|r|semibold|none)$/.test(m[1]) || /^(b|l|t|r)-\d/.test(m[1]) || /^(offset-)?\d/.test(m[1])) continue;
      assert.ok(allowed.has(m[1]), `${f}: color class ${m[0]} is not band, band-ink or line`);
    }
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(s), `${f}: a hex color`);
  }
  const css = read("app/globals.css");
  assert.equal((css.match(/--band-ink: #[0-9a-f]{6};/g) ?? []).length, 5, "band-ink in 5 themes");
  assert.ok(read("scripts/contrast-dark.mjs").includes('"VW99: header text on the header band", "band-ink", "band", false, true'));
});

await check("no money, no e-mail address and no real article ID in the new parts", () => {
  const all = ["components/Nav.tsx", "components/NavMenuButton.tsx"].map(read).join("\n");
  assert.ok(!/\bUSD\b|\$\{?cost|dollar/i.test(all), "money");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(all), "e-mail");
  assert.ok(!/\b\d{4}-\d{4}-\d{4}\b/.test(all), "article id");
});

done();
