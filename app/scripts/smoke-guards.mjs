// Safety guards of scripts/smoke.mjs (unit TF83, round 84). Plain node, no import of app code.
// Round 83 answer 20 (Q-A 2026-11-02 l115) and round 84 answer 6 (l132): "Test guards from config (Recommended)".
// Before this unit the test pinned the PocketBase port 8092 and the folders .../r82/VW77b2/fx and .../rs. A copy of the harness in another folder or on another port failed.
// Now the guard reads the address and the folder from the config of the run and refuses only what is unsafe. The purpose stays the same:
//   1. A test never writes to the owner PocketBase (port 8090) and never writes to a PocketBase on another computer.
//   2. A test that writes files never writes into the data of the Translator or of the Viewer, or into any folder that the owner names in SMOKE_PROTECTED_DIRS.
//   3. The folder that the test writes into is the folder that the config names. Else the server reads one folder and the test writes into another.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const OWNER_PB_PORT = 8090;
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

/** Data folders that no test may write into. The Viewer data folder and the sibling Translator folder come from the place of this script, the rest from SMOKE_PROTECTED_DIRS (colon list). */
export function protectedDirs(env = process.env, here = path.dirname(fileURLToPath(import.meta.url))) {
  const v2 = path.resolve(here, "..", "..");
  const list = [path.join(v2, "data"), path.join(path.dirname(v2), "kendo-translation-translator", "data")];
  // The two real data folders of this Mac, named in the brief of unit TF83. They protect a copy of the app that lives in another folder.
  list.push(
    "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data",
    "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer/data",
  );
  for (const d of (env.SMOKE_PROTECTED_DIRS ?? "").split(":")) if (d.trim()) list.push(path.resolve(d.trim()));
  return [...new Set(list)];
}

async function realOrSelf(p) {
  try {
    return await fs.realpath(p);
  } catch {
    return path.resolve(p);
  }
}

/** True when `child` is `parent` or sits below it. Both are real paths. */
export function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * The PocketBase address of the run must be a throwaway server on this Mac: a local host, a port, and not the port 8090 of the owner.
 * Returns { ok, why }. `why` is a plain sentence for the check line.
 * Example: "http://127.0.0.1:8092" and "http://127.0.0.1:8093" pass. "http://127.0.0.1:8090" and "http://pb.example.com:8092" are refused.
 */
export function pbGuard(url) {
  let u;
  try {
    u = new URL(String(url ?? ""));
  } catch {
    return { ok: false, why: `Refused: the PocketBase address "${url ?? ""}" is not a web address.` };
  }
  const port = Number(u.port || (u.protocol === "https:" ? 443 : 80));
  if (!LOCAL_HOSTS.includes(u.hostname)) return { ok: false, why: `Refused: the PocketBase host ${u.hostname} is not on this Mac. A test writes only to a local throwaway PocketBase.` };
  if (port === OWNER_PB_PORT) return { ok: false, why: `Refused: the PocketBase port ${port} is the PocketBase of the owner. Use a throwaway PocketBase on another port (the harness uses 8092 or 8093).` };
  return { ok: true, why: `${u.hostname}:${port}` };
}

/**
 * The fixture folder that a test writes into. It passes when
 *   - its real path is not inside a protected data folder, and
 *   - the folder `data` below it exists, and
 *   - the config names this data folder in translatorDataDir (when a config is given).
 * Returns { ok, why }.
 * Example: fixture <harness>/fx with config translatorDataDir <harness>/fx/data passes. A fixture <T2>/data/book-store is refused.
 */
export async function fixtureGuard(fixtureDir, cfg, protect = protectedDirs()) {
  if (!fixtureDir) return { ok: false, why: "Refused: no fixture folder is given (--fixture DIR)." };
  const fx = await realOrSelf(fixtureDir);
  for (const p of protect) {
    if (isInside(fx, await realOrSelf(p))) return { ok: false, why: `Refused: the fixture folder ${fx} is inside the protected data folder ${p}. A test that writes files never runs there.` };
  }
  const data = path.join(fx, "data");
  const hasData = await fs.stat(data).then((s) => s.isDirectory(), () => false);
  if (!hasData) return { ok: false, why: `Refused: the folder ${data} does not exist. Build the fixture first (fake_translator.py or restart_fixture.py).` };
  if (cfg) {
    const named = cfg.translatorDataDir ? await realOrSelf(String(cfg.translatorDataDir)) : "";
    const here = await realOrSelf(data);
    if (named !== here) return { ok: false, why: `Refused: the config names translatorDataDir ${named || "(nothing)"}, but the fixture data folder is ${here}. The server and the test must use the same folder.` };
  }
  return { ok: true, why: fx };
}
