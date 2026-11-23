// Unit VW85 (round 91): the shared parts of the server-free Viewer tests, taken from scripts/vw98-test.mjs (VW98) so that a new test does not
// copy them again. scripts/vw95-test.mjs and scripts/vw98-test.mjs keep their own copy: this unit does not change them.
// Use: import the kit, call installAppHooks(app) once, then import the app files with a dynamic import().
// The hooks stub "server-only" and next/navigation, resolve the "@/" alias, and transpile .tsx with the typescript package of the app.
import assert from "node:assert/strict";
import { existsSync, readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";

/** Register the resolve and load hooks for the app folder `app`. `pathname`: the value of the usePathname stub. */
export function installAppHooks(app, pathname = "/runs/x") {
  const ts = createRequire(path.join(app, "package.json"))("typescript");
  const withExt = (base) => (existsSync(base + ".ts") ? base + ".ts" : base + ".tsx");
  const nav = `export const useRouter = () => ({ push() {} }); export const useSearchParams = () => new URLSearchParams(); export const usePathname = () => ${JSON.stringify(pathname)}; export const notFound = () => { throw new Error("notFound"); }; export const redirect = (u) => { throw new Error("redirect " + u); };`;
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
      if (specifier.startsWith("@/")) return next(pathToFileURL(withExt(path.join(app, specifier.slice(2)))).href, context);
      if (specifier === "next/navigation") return { url: `data:text/javascript,${encodeURIComponent(nav)}`, shortCircuit: true };
      if (/^next\/[a-z-]+$/.test(specifier)) return next(`${specifier}.js`, context);
      if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/") && !path.extname(specifier)) return next(pathToFileURL(withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))).href, context);
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.endsWith(".tsx")) {
        const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
        return { format: "module", source, shortCircuit: true };
      }
      if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" };
      return next(url, context);
    },
  });
}

/** A check counter: `check(name, fn)` prints "ok" or "FAIL"; `done()` prints "<n> passed, <m> failed" and sets the exit code. */
export function checker() {
  let passed = 0;
  let failed = 0;
  return {
    async check(name, fn) {
      try {
        await fn();
        passed++;
        console.log(`ok    ${name}`);
      } catch (e) {
        failed++;
        console.log(`FAIL  ${name}\n      ${String(e && e.message ? e.message : e).split("\n").slice(0, 8).join("\n      ")}`);
      }
    },
    done() {
      console.log(`${passed} passed, ${failed} failed`);
      process.exitCode = failed ? 1 : 0;
      return failed;
    },
  };
}

/** A made-up data folder below TMPDIR. `w(rel, value)` writes a file (an object as JSON), `jl(rows)` makes JSON lines. */
export async function madeUpRoot(prefix) {
  assert.ok(process.env.TMPDIR, "Set TMPDIR (use the unit folder tmp)");
  const base = await fs.mkdtemp(path.join(process.env.TMPDIR, prefix));
  const root = await fs.realpath(base);
  const w = async (rel, v) => {
    const f = path.join(root, rel);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, typeof v === "string" ? v : JSON.stringify(v));
  };
  return { base, root, w };
}

export const jl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

/** Path, size and time of each file below `dir`, sorted. Two equal snapshots show that a loader wrote nothing. */
export async function snapshot(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const f = path.join(e.parentPath, e.name);
    const st = await fs.stat(f);
    out.push(`${f}:${st.size}:${st.mtimeMs}`);
  }
  return out.sort();
}

/** The visible text of rendered HTML, with the common entities decoded and the spaces joined. */
export function htmlText(html) {
  return html
    // unit VW127 (Q-A 3:122.4): a highlight span (data-hl) only colors a piece of a text. It adds no space, so "(" + span + ")" reads "(5)" as in the browser.
    .replace(/<span [^>]*data-hl="[^"]*"[^>]*>([^<]*)<\/span>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
