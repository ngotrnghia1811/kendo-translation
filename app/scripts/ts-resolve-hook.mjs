// Resolve hook for plain Node (unit S2C, round 56. Unit RC2, round 65: changed from module.register() to module.registerHooks()).
// The app files in app/lib import each other without a file extension, for example `./htv-groups`. Next accepts that.
// Plain Node needs `.ts`. This hook retries a relative import with `.ts` when the first try fails.
// No app file changes. Call `installTsResolveHook()` once, before the first import of an app file (use a dynamic import() after the call).
// Node 26 warns DEP0205 for module.register() (hooks on a second thread). module.registerHooks() runs the hooks on the same thread and gives no warning.
import { registerHooks } from "node:module";

export function resolve(specifier, context, nextResolve) {
  try {
    return nextResolve(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && err && err.code === "ERR_MODULE_NOT_FOUND" && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(specifier + ".ts", context);
    }
    throw err;
  }
}

// Load a .ts file as a module with type stripping. This skips the format guess, so Node prints no
// MODULE_TYPELESS_PACKAGE_JSON warning (app/package.json has no key "type" and must stay as it is).
export function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".ts")) {
    return nextLoad(url, { ...context, format: "module-typescript" });
  }
  return nextLoad(url, context);
}

let installed = null;

/** Register the two hooks. A second call does nothing. */
export function installTsResolveHook() {
  if (!installed) installed = registerHooks({ resolve, load });
  return installed;
}
