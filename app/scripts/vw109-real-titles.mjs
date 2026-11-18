// VW109 (round 95, card P44.1, check c4): read-only look at the real titles with the new files-mode lookup.
// It runs listBookRows (the book list of /translate) on the real Translator data folder and prints one line for each book of the list:
//   <slug> <English title> | <Japanese title>
// The data folder is read only. No file is written there. Set VW109_DATA to the folder (default: the Translator worktree data folder).
// Run: node scripts/vw109-real-titles.mjs (from the app folder, TMPDIR set). A last line "# <n> rows" follows the list.
import { promises as fs } from "node:fs";
import path from "node:path";
import { installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
const DATA = process.env.VW109_DATA ?? "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data";
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW109 real-title script.");
};
if (!process.env.TMPDIR) throw new Error("Set TMPDIR (use the unit folder tmp)");
const cfgDir = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw109-real-"));
const configFile = path.join(cfgDir, "viewer.config.json");
await fs.writeFile(configFile, JSON.stringify({ translatorDataDir: DATA, runSource: "files" }));
process.env.VIEWER_CONFIG = configFile;
delete process.env.VIEWER_RUN_SOURCE;
installAppHooks(app);
const B = await import("../lib/htv-books.ts");
const rows = await B.listBookRows(new Map(), "no-token");
for (const r of rows) console.log(`${r.slug} ${r.titleEn} | ${r.titleJa}`);
console.log(`# ${rows.length} rows`);
await fs.rm(cfgDir, { recursive: true, force: true });
