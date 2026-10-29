// Resolve hook for plain Node (unit S2C, round 56).
// The app files in app/lib import each other without a file extension, for example `./htv-groups`. Next accepts that.
// Plain Node needs `.ts`. This hook retries a relative import with `.ts` when the first try fails.
// No app file changes. Use it with `register("./ts-resolve-hook.mjs", import.meta.url)` from node:module.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
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
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".ts")) {
    return nextLoad(url, { ...context, format: "module-typescript" });
  }
  return nextLoad(url, context);
}
